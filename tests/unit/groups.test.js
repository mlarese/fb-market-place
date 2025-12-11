import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock AWS SDK
const mockPutItem = jest.fn();
const mockGetItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockScan = jest.fn();

jest.unstable_mockModule('../../src/lib/dynamodb.js', () => ({
  putItem: mockPutItem,
  getItem: mockGetItem,
  updateItem: mockUpdateItem,
  scan: mockScan,
  query: jest.fn(),
  deleteItem: jest.fn(),
}));

const { handler } = await import('../../src/functions/groups/index.js');

describe('Groups Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GROUPS_TABLE = 'TestGroupsTable';
    process.env.USERS_TABLE = 'TestUsersTable';
  });

  describe('POST /groups - Create Group', () => {
    it('should create a new group with valid data', async () => {
      mockPutItem.mockResolvedValue({});

      const event = {
        httpMethod: 'POST',
        path: '/groups',
        body: JSON.stringify({
          name: 'Test Group',
          description: 'A test group',
          leaderId: 'user-123',
        }),
        requestContext: { authorizer: { userId: 'user-123' } },
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(body.name).toBe('Test Group');
      expect(body.leaderId).toBe('user-123');
      expect(body.members).toContain('user-123');
      expect(body.memberCount).toBe(1);
      expect(mockPutItem).toHaveBeenCalled();
    });

    it('should return 400 if name is missing', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/groups',
        body: JSON.stringify({}),
        requestContext: { authorizer: { userId: 'user-123' } },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain('name');
    });
  });

  describe('GET /groups/{id} - Get Group Info', () => {
    it('should return group info for members', async () => {
      mockGetItem.mockResolvedValue({
        groupId: 'group-123',
        name: 'Test Group',
        leaderId: 'leader-123',
        members: ['leader-123', 'user-456'],
        memberCount: 2,
        stats: { totalSales: 10 },
        settings: { exclusiveListings: false },
      });

      const event = {
        httpMethod: 'GET',
        path: '/groups/group-123',
        pathParameters: { id: 'group-123' },
        requestContext: { authorizer: { userId: 'user-456' } },
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.name).toBe('Test Group');
      expect(body.userRole).toBe('member');
      // Members should NOT see full stats/settings
      expect(body.stats).toBeUndefined();
    });

    it('should return full info for leader', async () => {
      mockGetItem.mockResolvedValue({
        groupId: 'group-123',
        name: 'Test Group',
        leaderId: 'leader-123',
        members: ['leader-123'],
        memberCount: 1,
        stats: { totalSales: 10 },
        settings: { exclusiveListings: false },
      });

      const event = {
        httpMethod: 'GET',
        path: '/groups/group-123',
        pathParameters: { id: 'group-123' },
        requestContext: { authorizer: { userId: 'leader-123' } },
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.userRole).toBe('leader');
      expect(body.stats).toBeDefined();
      expect(body.settings).toBeDefined();
    });

    it('should return 404 for non-existent group', async () => {
      mockGetItem.mockResolvedValue(null);

      const event = {
        httpMethod: 'GET',
        path: '/groups/nonexistent',
        pathParameters: { id: 'nonexistent' },
        requestContext: { authorizer: { userId: 'user-123' } },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });
  });

  describe('POST /groups/{id}/members - Add Member', () => {
    it('should add a new member', async () => {
      mockGetItem.mockResolvedValue({
        groupId: 'group-123',
        leaderId: 'leader-123',
        members: ['leader-123'],
        settings: { autoApproveMembers: true },
      });
      mockUpdateItem.mockResolvedValue({ memberCount: 2 });

      const event = {
        httpMethod: 'POST',
        path: '/groups/group-123/members',
        pathParameters: { id: 'group-123' },
        body: JSON.stringify({ userId: 'new-user' }),
        requestContext: { authorizer: { userId: 'leader-123' } },
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.memberId).toBe('new-user');
    });

    it('should reject duplicate member', async () => {
      mockGetItem.mockResolvedValue({
        groupId: 'group-123',
        leaderId: 'leader-123',
        members: ['leader-123', 'existing-user'],
        settings: { autoApproveMembers: true },
      });

      const event = {
        httpMethod: 'POST',
        path: '/groups/group-123/members',
        pathParameters: { id: 'group-123' },
        body: JSON.stringify({ userId: 'existing-user' }),
        requestContext: { authorizer: { userId: 'leader-123' } },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain('already');
    });
  });

  describe('DELETE /groups/{id}/members/{userId} - Remove Member', () => {
    it('should allow leader to remove member', async () => {
      mockGetItem.mockResolvedValue({
        groupId: 'group-123',
        leaderId: 'leader-123',
        members: ['leader-123', 'user-456'],
      });
      mockUpdateItem.mockResolvedValue({});

      const event = {
        httpMethod: 'DELETE',
        path: '/groups/group-123/members/user-456',
        pathParameters: { id: 'group-123', userId: 'user-456' },
        requestContext: { authorizer: { userId: 'leader-123' } },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
    });

    it('should not allow removing the leader', async () => {
      mockGetItem.mockResolvedValue({
        groupId: 'group-123',
        leaderId: 'leader-123',
        members: ['leader-123', 'user-456'],
      });

      const event = {
        httpMethod: 'DELETE',
        path: '/groups/group-123/members/leader-123',
        pathParameters: { id: 'group-123', userId: 'leader-123' },
        requestContext: { authorizer: { userId: 'leader-123' } },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toContain('leader');
    });
  });
});
