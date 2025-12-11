import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, updateItem, deleteItem, query, scan } from '../../lib/dynamodb.js';
import { success, created, noContent, badRequest, notFound, forbidden } from '../../lib/response.js';

const GROUPS_TABLE = process.env.GROUPS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Groups Service Handler (STORY-019, 020, 021, 022, 025)
 * Routes: POST /groups, GET /groups, GET /groups/{id}, POST /groups/{id}/members, DELETE /groups/{id}/members/{userId}
 */
export async function handler(event) {
  console.log('Groups handler:', JSON.stringify(event));

  const method = event.httpMethod;
  const path = event.path || '';
  const pathParams = event.pathParameters || {};
  const groupId = pathParams.id || pathParams.groupId;

  try {
    // Create group
    if (method === 'POST' && !groupId) {
      return await createGroup(event);
    }

    // Get group info
    if (method === 'GET' && groupId && !path.includes('/members')) {
      return await getGroupInfo(groupId, event);
    }

    // List user's groups
    if (method === 'GET' && !groupId) {
      return await getUserGroups(event);
    }

    // Add member to group
    if (method === 'POST' && groupId && path.includes('/members')) {
      return await addMember(groupId, event);
    }

    // Remove member from group
    if (method === 'DELETE' && groupId && pathParams.userId) {
      return await removeMember(groupId, pathParams.userId, event);
    }

    // Transfer leadership
    if (method === 'PUT' && groupId && path.includes('/leader')) {
      return await transferLeadership(groupId, event);
    }

    return badRequest('Unsupported operation');
  } catch (err) {
    console.error('Groups error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

/**
 * Create a new group (STORY-019)
 */
async function createGroup(event) {
  const body = JSON.parse(event.body || '{}');
  const userId = event.requestContext?.authorizer?.userId || body.leaderId;

  if (!userId) {
    return badRequest('Authentication required');
  }

  if (!body.name) {
    return badRequest('Group name is required');
  }

  const now = new Date().toISOString();

  const group = {
    groupId: uuidv4(),
    name: body.name,
    description: body.description || '',
    leaderId: userId,
    facebookGroupId: body.facebookGroupId || null,
    members: [userId], // Leader is first member
    memberCount: 1,
    settings: {
      exclusiveListings: body.exclusiveListings ?? false,
      autoApproveMembers: body.autoApproveMembers ?? true,
    },
    stats: {
      totalListings: 0,
      totalSales: 0,
      totalCashback: 0,
    },
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await putItem(GROUPS_TABLE, group);

  console.log('Group created:', group.groupId);
  return created(group);
}

/**
 * Get group info (STORY-022)
 */
async function getGroupInfo(groupId, event) {
  const group = await getItem(GROUPS_TABLE, { groupId });

  if (!group) {
    return notFound('Group not found');
  }

  const userId = event.requestContext?.authorizer?.userId;
  const isLeader = group.leaderId === userId;
  const isMember = group.members?.includes(userId);

  // Return full stats only for leader
  const response = {
    groupId: group.groupId,
    name: group.name,
    description: group.description,
    leaderId: group.leaderId,
    memberCount: group.memberCount || group.members?.length || 0,
    facebookGroupId: group.facebookGroupId,
    status: group.status,
    createdAt: group.createdAt,
  };

  // Include member list and stats for leader
  if (isLeader) {
    response.members = group.members;
    response.stats = group.stats;
    response.settings = group.settings;
  }

  // Include user's role
  if (userId) {
    response.userRole = isLeader ? 'leader' : (isMember ? 'member' : null);
  }

  return success(response);
}

/**
 * Get user's groups (STORY-025)
 */
async function getUserGroups(event) {
  const userId = event.requestContext?.authorizer?.userId;

  if (!userId) {
    return badRequest('Authentication required');
  }

  // Scan groups and filter by membership
  // Note: In production, use a GSI for better performance
  const allGroups = await scan(GROUPS_TABLE);

  const userGroups = allGroups
    .filter(g => g.members?.includes(userId))
    .map(g => ({
      groupId: g.groupId,
      name: g.name,
      description: g.description,
      memberCount: g.memberCount || g.members?.length,
      role: g.leaderId === userId ? 'leader' : 'member',
      joinedAt: g.createdAt, // Simplified - should track actual join date
    }));

  return success({
    groups: userGroups,
    total: userGroups.length,
  });
}

/**
 * Add member to group (STORY-020)
 */
async function addMember(groupId, event) {
  const body = JSON.parse(event.body || '{}');
  const requesterId = event.requestContext?.authorizer?.userId;
  const newMemberId = body.userId;

  if (!newMemberId) {
    return badRequest('userId is required');
  }

  const group = await getItem(GROUPS_TABLE, { groupId });

  if (!group) {
    return notFound('Group not found');
  }

  // Only leader can add members (unless autoApprove is on)
  if (group.leaderId !== requesterId && !group.settings?.autoApproveMembers) {
    return forbidden('Only group leader can add members');
  }

  // Check if already a member
  if (group.members?.includes(newMemberId)) {
    return badRequest('User is already a member');
  }

  // Add member
  const updatedGroup = await updateItem(
    GROUPS_TABLE,
    { groupId },
    'SET members = list_append(if_not_exists(members, :empty), :newMember), memberCount = memberCount + :one, updatedAt = :now',
    {
      ':empty': [],
      ':newMember': [newMemberId],
      ':one': 1,
      ':now': new Date().toISOString(),
    }
  );

  console.log(`Member ${newMemberId} added to group ${groupId}`);

  return success({
    groupId,
    memberId: newMemberId,
    memberCount: updatedGroup.memberCount,
  });
}

/**
 * Remove member from group (STORY-021)
 */
async function removeMember(groupId, memberId, event) {
  const requesterId = event.requestContext?.authorizer?.userId;

  const group = await getItem(GROUPS_TABLE, { groupId });

  if (!group) {
    return notFound('Group not found');
  }

  // Only leader can remove members (or user removing themselves)
  if (group.leaderId !== requesterId && memberId !== requesterId) {
    return forbidden('Only group leader can remove members');
  }

  // Cannot remove leader
  if (memberId === group.leaderId) {
    return badRequest('Cannot remove group leader. Transfer leadership first.');
  }

  // Check if member exists
  const memberIndex = group.members?.indexOf(memberId);
  if (memberIndex === -1 || memberIndex === undefined) {
    return notFound('User is not a member of this group');
  }

  // Remove member
  const newMembers = group.members.filter(m => m !== memberId);

  await updateItem(
    GROUPS_TABLE,
    { groupId },
    'SET members = :members, memberCount = :count, updatedAt = :now',
    {
      ':members': newMembers,
      ':count': newMembers.length,
      ':now': new Date().toISOString(),
    }
  );

  console.log(`Member ${memberId} removed from group ${groupId}`);

  return noContent();
}

/**
 * Transfer group leadership (STORY-026)
 */
async function transferLeadership(groupId, event) {
  const body = JSON.parse(event.body || '{}');
  const requesterId = event.requestContext?.authorizer?.userId;
  const newLeaderId = body.newLeaderId;

  if (!newLeaderId) {
    return badRequest('newLeaderId is required');
  }

  const group = await getItem(GROUPS_TABLE, { groupId });

  if (!group) {
    return notFound('Group not found');
  }

  // Only current leader can transfer
  if (group.leaderId !== requesterId) {
    return forbidden('Only current leader can transfer leadership');
  }

  // New leader must be a member
  if (!group.members?.includes(newLeaderId)) {
    return badRequest('New leader must be a group member');
  }

  await updateItem(
    GROUPS_TABLE,
    { groupId },
    'SET leaderId = :newLeader, updatedAt = :now',
    {
      ':newLeader': newLeaderId,
      ':now': new Date().toISOString(),
    }
  );

  console.log(`Leadership of group ${groupId} transferred to ${newLeaderId}`);

  return success({
    groupId,
    newLeaderId,
    previousLeaderId: requesterId,
  });
}

export default { handler, createGroup, addMember, removeMember, getGroupInfo, getUserGroups };
