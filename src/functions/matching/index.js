import { query, updateItem, getItem } from '../../lib/dynamodb.js';
import { search } from '../../lib/opensearch.js';
import { sendMatchNotification, sendMessage } from '../../lib/messenger.js';
import { success, badRequest } from '../../lib/response.js';

const REQUESTS_TABLE = process.env.REQUESTS_TABLE;
const LISTINGS_TABLE = process.env.LISTINGS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const LISTINGS_INDEX = 'listings';

/**
 * Matching Service Handler (STORY-013, 014, 015)
 * Handles periodic matching between requests and listings
 */
export async function handler(event) {
  console.log('Matching handler:', JSON.stringify(event));

  // Check if this is a scheduled event or API call
  const isScheduled = event.source === 'aws.events' ||
    event['detail-type'] === 'Scheduled Event';

  if (isScheduled || event.httpMethod === 'POST') {
    return await runMatching(event);
  }

  return badRequest('Unsupported operation');
}

/**
 * Run the matching algorithm (STORY-013)
 */
async function runMatching(event) {
  console.log('Starting matching run...');

  const results = {
    requestsProcessed: 0,
    matchesFound: 0,
    notificationsSent: 0,
    errors: [],
  };

  try {
    // Get all active requests
    const activeRequests = await query(
      REQUESTS_TABLE,
      'status = :status',
      { ':status': 'active' },
      'status-index'
    );

    console.log(`Found ${activeRequests.length} active requests`);

    // Process each request
    for (const request of activeRequests) {
      try {
        const matches = await findMatchesForRequest(request);
        results.requestsProcessed++;

        if (matches.length > 0) {
          // Filter out already notified matches
          const newMatches = matches.filter(m =>
            !request.matchedListings?.includes(m.id)
          );

          if (newMatches.length > 0) {
            // Notify buyer (STORY-014)
            await notifyBuyer(request, newMatches);
            results.matchesFound += newMatches.length;
            results.notificationsSent++;

            // Notify sellers (STORY-015)
            await notifySellers(request, newMatches);
            results.notificationsSent += newMatches.length;

            // Update request with matched listings
            const allMatched = [...(request.matchedListings || []), ...newMatches.map(m => m.id)];
            await updateItem(
              REQUESTS_TABLE,
              { id: request.id },
              'SET matchedListings = :matched, notifiedAt = :now, updatedAt = :now',
              {
                ':matched': allMatched,
                ':now': new Date().toISOString(),
              }
            );
          }
        }
      } catch (err) {
        console.error(`Error processing request ${request.id}:`, err);
        results.errors.push({ requestId: request.id, error: err.message });
      }
    }
  } catch (err) {
    console.error('Matching run failed:', err);
    results.errors.push({ error: err.message });
  }

  console.log('Matching run complete:', results);
  return success(results);
}

/**
 * Find matching listings for a request
 */
async function findMatchesForRequest(request) {
  const must = [];
  const filter = [];
  const should = [];

  // Only active listings
  filter.push({ term: { status: 'active' } });

  // Category match (exact)
  if (request.category && request.category !== 'altro') {
    filter.push({ term: { category: request.category } });
  }

  // Price range
  if (request.prezzoMin || request.prezzoMax) {
    const range = {};
    if (request.prezzoMin) range.gte = parseFloat(request.prezzoMin);
    if (request.prezzoMax) range.lte = parseFloat(request.prezzoMax);
    filter.push({ range: { price: range } });
  }

  // Keywords match (boost)
  if (request.paroleChiave?.length > 0) {
    should.push({
      terms: {
        keywords: request.paroleChiave,
        boost: 2,
      },
    });
  }

  // Description match (fuzzy)
  if (request.description) {
    should.push({
      multi_match: {
        query: request.description,
        fields: ['title^2', 'description'],
        fuzziness: 'AUTO',
        boost: 1.5,
      },
    });
  }

  // Location match (if provided)
  if (request.localita) {
    should.push({
      match: {
        locationText: {
          query: request.localita,
          boost: 1.2,
        },
      },
    });
  }

  // Group priority (STORY-017)
  // Requests from group members get boosted matches from same group
  // This would require knowing the user's groups

  const searchQuery = {
    bool: {
      must: must.length > 0 ? must : [{ match_all: {} }],
      filter,
      should,
      minimum_should_match: should.length > 0 ? 1 : 0,
    },
  };

  const results = await search(LISTINGS_INDEX, searchQuery, {
    size: 10,
    sort: [
      { _score: { order: 'desc' } },
      { createdAt: { order: 'desc' } },
    ],
  });

  // Filter by minimum score
  return results.hits.filter(hit => hit.score > 1.0);
}

/**
 * Notify buyer of matching listings (STORY-014, STORY-055)
 */
async function notifyBuyer(request, matches) {
  // Get user info to find Messenger ID
  const user = await getItem(USERS_TABLE, { userId: request.userId });

  if (!user?.facebookId) {
    console.log(`No Facebook ID for user ${request.userId}, skipping notification`);
    return;
  }

  const language = user.language || 'it';

  // Send notification for top match
  const topMatch = matches[0];

  try {
    await sendMatchNotification(user.facebookId, topMatch, language);

    // If multiple matches, send summary
    if (matches.length > 1) {
      const messages = {
        it: `Trovati ${matches.length} annunci compatibili con la tua ricerca "${request.description?.substring(0, 30)}..."`,
        en: `Found ${matches.length} listings matching your search "${request.description?.substring(0, 30)}..."`,
      };
      await sendMessage(user.facebookId, messages[language] || messages.it);
    }

    console.log(`Notified buyer ${request.userId} of ${matches.length} matches`);
  } catch (err) {
    console.error(`Failed to notify buyer ${request.userId}:`, err);
  }
}

/**
 * Notify sellers of relevant request (STORY-015, STORY-056)
 */
async function notifySellers(request, matches) {
  // Get unique seller IDs
  const sellerIds = [...new Set(matches.map(m => m.userId))];

  for (const sellerId of sellerIds) {
    // Get seller info
    const seller = await getItem(USERS_TABLE, { userId: sellerId });

    if (!seller?.facebookId) {
      continue;
    }

    const language = seller.language || 'it';

    // Send anonymous request notification
    const messages = {
      it: `C'e una richiesta per "${request.category || 'prodotto'}" nella tua zona! Budget: ${request.prezzoMax ? `fino a ${request.prezzoMax}€` : 'non specificato'}`,
      en: `There's a request for "${request.category || 'product'}" in your area! Budget: ${request.prezzoMax ? `up to ${request.prezzoMax}€` : 'not specified'}`,
    };

    try {
      await sendMessage(seller.facebookId, messages[language] || messages.it);
      console.log(`Notified seller ${sellerId} of relevant request`);
    } catch (err) {
      console.error(`Failed to notify seller ${sellerId}:`, err);
    }
  }
}

export default { handler, runMatching, findMatchesForRequest };
