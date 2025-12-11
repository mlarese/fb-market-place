import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, deleteItem, query } from '../../lib/dynamodb.js';
import { indexDocument, deleteDocument, search } from '../../lib/opensearch.js';
import { success, created, noContent, badRequest, notFound, forbidden } from '../../lib/response.js';

const LISTINGS_TABLE = process.env.LISTINGS_TABLE;
const LISTINGS_INDEX = 'listings';

/**
 * Listings Service Handler
 * Routes: POST /listings, GET /listings, GET /listings/{id}, DELETE /listings/{id}
 */
export async function handler(event) {
  console.log('Listings handler:', JSON.stringify(event));

  const method = event.httpMethod;
  const pathParams = event.pathParameters || {};
  const listingId = pathParams.id;

  try {
    switch (method) {
      case 'POST':
        return await createListing(event);
      case 'GET':
        if (listingId) {
          return await getListing(listingId);
        }
        return await searchListings(event);
      case 'DELETE':
        if (!listingId) {
          return badRequest('Listing ID required');
        }
        return await deleteListing(listingId, event);
      default:
        return badRequest('Unsupported method');
    }
  } catch (err) {
    console.error('Listings error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

/**
 * Create a new listing (STORY-003)
 */
async function createListing(event) {
  const body = JSON.parse(event.body || '{}');
  const userId = event.requestContext?.authorizer?.userId || body.userId;

  if (!userId) {
    return badRequest('userId is required');
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  const listing = {
    id: uuidv4(),
    userId,
    groupId: body.groupId || null,
    groupExclusive: body.groupExclusive ?? false, // STORY-023: Only visible to group members
    title: body.title || body.titolo || '',
    description: body.description || body.descrizione || '',
    category: body.category || body.categoria || 'altro',
    price: parseFloat(body.price || body.prezzo) || 0,
    currency: body.currency || body.valuta || 'EUR',
    localita: body.localita || body.location || '',
    latitude: body.latitude || null,
    longitude: body.longitude || null,
    paroleChiave: body.paroleChiave || body.keywords || [],
    condizione: body.condizione || body.condition || null,
    spedizione: body.spedizione || body.shipping || false,
    images: body.images || [],
    facebookPostId: body.facebookPostId || null,
    facebookGroupId: body.facebookGroupId || null, // STORY-024: Linked Facebook Group
    status: 'active',
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  // Save to DynamoDB
  await putItem(LISTINGS_TABLE, listing);

  console.log('Listing created:', listing.id);
  return created(listing);
}

/**
 * Get a single listing by ID
 */
async function getListing(listingId) {
  const listing = await getItem(LISTINGS_TABLE, { id: listingId });

  if (!listing) {
    return notFound('Listing not found');
  }

  return success(listing);
}

/**
 * Search listings with filters (STORY-005, STORY-023)
 */
async function searchListings(event) {
  const params = event.queryStringParameters || {};
  const userId = event.requestContext?.authorizer?.userId;

  const {
    q,           // Full-text query
    category,    // Category filter
    minPrice,    // Min price
    maxPrice,    // Max price
    location,    // Location text
    groupId,     // Group filter
    includeExclusive, // Include group-exclusive listings
    status = 'active',
    page = '1',
    limit = '20',
  } = params;

  const from = (parseInt(page) - 1) * parseInt(limit);
  const size = parseInt(limit);

  // Build OpenSearch query
  const must = [];
  const filter = [];

  // Full-text search
  if (q) {
    must.push({
      multi_match: {
        query: q,
        fields: ['title^2', 'description', 'keywords'],
        fuzziness: 'AUTO',
      },
    });
  }

  // Category filter
  if (category) {
    filter.push({ term: { category } });
  }

  // Price range
  if (minPrice || maxPrice) {
    const range = {};
    if (minPrice) range.gte = parseFloat(minPrice);
    if (maxPrice) range.lte = parseFloat(maxPrice);
    filter.push({ range: { price: range } });
  }

  // Location text search
  if (location) {
    must.push({
      match: { locationText: location },
    });
  }

  // Group filter
  if (groupId) {
    filter.push({ term: { groupId } });
  }

  // Status filter
  filter.push({ term: { status } });

  // STORY-023: Group exclusive filter
  // By default, exclude group-exclusive listings unless user is in that group
  if (!includeExclusive) {
    filter.push({
      bool: {
        should: [
          { term: { groupExclusive: false } },
          { bool: { must_not: { exists: { field: 'groupExclusive' } } } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const searchQuery = {
    bool: {
      must: must.length > 0 ? must : [{ match_all: {} }],
      filter,
    },
  };

  const results = await search(LISTINGS_INDEX, searchQuery, {
    from,
    size,
    sort: [{ createdAt: { order: 'desc' } }],
  });

  return success({
    listings: results.hits,
    total: results.total,
    page: parseInt(page),
    limit: size,
    pages: Math.ceil(results.total / size),
  });
}

/**
 * Delete a listing (STORY-006)
 */
async function deleteListing(listingId, event) {
  const userId = event.requestContext?.authorizer?.userId;

  // Get listing to verify ownership
  const listing = await getItem(LISTINGS_TABLE, { id: listingId });

  if (!listing) {
    return notFound('Listing not found');
  }

  // Verify ownership (skip if no auth context - internal call)
  if (userId && listing.userId !== userId) {
    return forbidden('You can only delete your own listings');
  }

  // Delete from DynamoDB
  await deleteItem(LISTINGS_TABLE, { id: listingId });

  // OpenSearch will be updated via DynamoDB Streams

  console.log('Listing deleted:', listingId);
  return noContent();
}

export default { handler, createListing, searchListings, deleteListing };
