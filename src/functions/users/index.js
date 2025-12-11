import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, updateItem, query } from '../../lib/dynamodb.js';
import { getUserProfile, exchangeToken, debugToken } from '../../lib/facebook.js';
import { success, created, badRequest, unauthorized, notFound } from '../../lib/response.js';

const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Users Service Handler
 * Routes: POST /auth/facebook, GET /users/me, PUT /users/me
 */
export async function handler(event) {
  console.log('Users handler:', JSON.stringify(event));

  const method = event.httpMethod;
  const path = event.path || '';

  try {
    // Facebook Login (STORY-060)
    if (method === 'POST' && path.includes('/auth/facebook')) {
      return await facebookLogin(event);
    }

    // Get current user profile
    if (method === 'GET' && path.includes('/users/me')) {
      return await getCurrentUser(event);
    }

    // Update current user profile (STORY-061)
    if (method === 'PUT' && path.includes('/users/me')) {
      return await updateCurrentUser(event);
    }

    // Get user by ID (internal)
    if (method === 'GET' && event.pathParameters?.id) {
      return await getUser(event.pathParameters.id);
    }

    return badRequest('Unsupported operation');
  } catch (err) {
    console.error('Users error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

/**
 * Facebook Login - exchange token, get/create user (STORY-060)
 */
async function facebookLogin(event) {
  const body = JSON.parse(event.body || '{}');
  const { accessToken, shortLivedToken } = body;

  if (!accessToken && !shortLivedToken) {
    return badRequest('accessToken or shortLivedToken required');
  }

  let token = accessToken;

  // Exchange short-lived token if provided
  if (shortLivedToken) {
    try {
      const exchanged = await exchangeToken(shortLivedToken);
      token = exchanged.accessToken;
    } catch (err) {
      return unauthorized('Invalid short-lived token');
    }
  }

  // Validate token
  const tokenInfo = await debugToken(token);
  if (!tokenInfo.isValid) {
    return unauthorized('Invalid access token');
  }

  // Get Facebook profile
  const fbProfile = await getUserProfile(tokenInfo.userId, token);

  // Find or create user
  let user = await findUserByFacebookId(fbProfile.facebookId);

  if (user) {
    // Update existing user
    user = await updateItem(
      USERS_TABLE,
      { userId: user.userId },
      'SET #name = :name, picture = :picture, lastLoginAt = :lastLoginAt, updatedAt = :updatedAt',
      {
        ':name': fbProfile.name,
        ':picture': fbProfile.picture,
        ':lastLoginAt': new Date().toISOString(),
        ':updatedAt': new Date().toISOString(),
      },
      { '#name': 'name' }
    );
  } else {
    // Create new user
    user = await createUser(fbProfile);
  }

  return success({
    user: sanitizeUser(user),
    accessToken: token,
    expiresAt: tokenInfo.expiresAt,
  });
}

/**
 * Get current user profile
 */
async function getCurrentUser(event) {
  const userId = event.requestContext?.authorizer?.userId;

  if (!userId) {
    return unauthorized('Authentication required');
  }

  const user = await getItem(USERS_TABLE, { userId });

  if (!user) {
    return notFound('User not found');
  }

  return success(sanitizeUser(user));
}

/**
 * Update current user profile (STORY-061)
 */
async function updateCurrentUser(event) {
  const userId = event.requestContext?.authorizer?.userId;

  if (!userId) {
    return unauthorized('Authentication required');
  }

  const body = JSON.parse(event.body || '{}');
  const allowedFields = ['language', 'notificationsEnabled', 'displayName'];

  const updates = [];
  const values = { ':updatedAt': new Date().toISOString() };

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = :${field}`);
      values[`:${field}`] = body[field];
    }
  }

  if (updates.length === 0) {
    return badRequest('No valid fields to update');
  }

  updates.push('updatedAt = :updatedAt');

  const user = await updateItem(
    USERS_TABLE,
    { userId },
    `SET ${updates.join(', ')}`,
    values
  );

  return success(sanitizeUser(user));
}

/**
 * Get user by ID (internal use)
 */
async function getUser(userId) {
  const user = await getItem(USERS_TABLE, { userId });

  if (!user) {
    return notFound('User not found');
  }

  return success(sanitizeUser(user));
}

/**
 * Find user by Facebook ID
 */
async function findUserByFacebookId(facebookId) {
  const results = await query(
    USERS_TABLE,
    'facebookId = :facebookId',
    { ':facebookId': facebookId },
    'facebookId-index'
  );

  return results[0] || null;
}

/**
 * Create a new user from Facebook profile
 */
async function createUser(fbProfile) {
  const now = new Date().toISOString();

  const user = {
    userId: uuidv4(),
    facebookId: fbProfile.facebookId,
    name: fbProfile.name,
    firstName: fbProfile.firstName,
    lastName: fbProfile.lastName,
    email: fbProfile.email,
    picture: fbProfile.picture,
    language: 'it',
    notificationsEnabled: true,
    referrerId: null,
    role: 'user',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await putItem(USERS_TABLE, user);
  console.log('User created:', user.userId);

  return user;
}

/**
 * Remove sensitive fields from user object
 */
function sanitizeUser(user) {
  const { email, ...publicUser } = user;
  return publicUser;
}

export default { handler, facebookLogin };
