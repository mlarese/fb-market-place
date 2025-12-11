import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, query } from '../../lib/dynamodb.js';
import { success, created, badRequest, notFound } from '../../lib/response.js';

const REQUESTS_TABLE = process.env.REQUESTS_TABLE;

/**
 * Requests Service Handler
 * Routes: POST /requests, GET /requests, GET /requests/active
 */
export async function handler(event) {
  console.log('Requests handler:', JSON.stringify(event));

  const method = event.httpMethod;
  const path = event.path || '';
  const pathParams = event.pathParameters || {};
  const requestId = pathParams.id;

  try {
    if (method === 'POST') {
      return await createRequest(event);
    }

    if (method === 'GET') {
      if (path.endsWith('/active')) {
        return await getActiveRequests(event);
      }
      if (requestId) {
        return await getRequest(requestId);
      }
      return await getUserRequests(event);
    }

    return badRequest('Unsupported method');
  } catch (err) {
    console.error('Requests error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

/**
 * Create a new purchase request (STORY-010)
 */
async function createRequest(event) {
  const body = JSON.parse(event.body || '{}');
  const userId = event.requestContext?.authorizer?.userId || body.userId;

  if (!userId) {
    return badRequest('userId is required');
  }

  if (!body.description && !body.descrizione) {
    return badRequest('description is required');
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const request = {
    id: uuidv4(),
    userId,
    description: body.description || body.descrizione || '',
    category: body.category || body.categoria || 'altro',
    prezzoMin: body.prezzoMin || body.minPrice || null,
    prezzoMax: body.prezzoMax || body.maxPrice || null,
    localita: body.localita || body.location || '',
    latitude: body.latitude || null,
    longitude: body.longitude || null,
    paroleChiave: body.paroleChiave || body.keywords || [],
    urgenza: body.urgenza || body.urgency || 'media',
    language: body.language || 'it',
    status: 'active',
    matchedListings: [],
    notifiedAt: null,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  // Save to DynamoDB
  await putItem(REQUESTS_TABLE, request);

  console.log('Request created:', request.id);
  return created(request);
}

/**
 * Get a single request by ID
 */
async function getRequest(requestId) {
  const request = await getItem(REQUESTS_TABLE, { id: requestId });

  if (!request) {
    return notFound('Request not found');
  }

  return success(request);
}

/**
 * Get all active requests (STORY-011)
 * Used by the matching workflow
 */
async function getActiveRequests(event) {
  const params = event.queryStringParameters || {};
  const limit = parseInt(params.limit) || 100;

  const requests = await query(
    REQUESTS_TABLE,
    'status = :status',
    { ':status': 'active' },
    'status-index'
  );

  // Filter out expired requests
  const now = new Date().toISOString();
  const activeRequests = requests.filter(r => !r.expiresAt || r.expiresAt > now);

  return success({
    requests: activeRequests.slice(0, limit),
    total: activeRequests.length,
  });
}

/**
 * Get requests for a specific user
 */
async function getUserRequests(event) {
  const userId = event.requestContext?.authorizer?.userId;
  const params = event.queryStringParameters || {};
  const status = params.status; // Optional filter

  if (!userId) {
    return badRequest('Authentication required');
  }

  let requests = await query(
    REQUESTS_TABLE,
    'userId = :userId',
    { ':userId': userId },
    'userId-index'
  );

  // Filter by status if provided
  if (status) {
    requests = requests.filter(r => r.status === status);
  }

  return success({
    requests,
    total: requests.length,
  });
}

export default { handler, createRequest, getActiveRequests };
