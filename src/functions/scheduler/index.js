import { updateItem, query, getItem } from '../../lib/dynamodb.js';
import { sendMessage } from '../../lib/messenger.js';
import { success } from '../../lib/response.js';

const LISTINGS_TABLE = process.env.LISTINGS_TABLE;
const REQUESTS_TABLE = process.env.REQUESTS_TABLE;
const BALANCES_TABLE = process.env.BALANCES_TABLE;
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Scheduler Handler
 * Handles scheduled tasks: listing expiration, request expiration, cashback release
 */
export async function handler(event) {
  console.log('Scheduler handler:', JSON.stringify(event));

  const taskType = event.taskType ||
    event.detail?.taskType ||
    event.queryStringParameters?.taskType ||
    'all';

  const results = {
    taskType,
    timestamp: new Date().toISOString(),
    listingsExpired: 0,
    requestsExpired: 0,
    cashbackReleased: 0,
    notificationsSent: 0,
    errors: [],
  };

  try {
    if (taskType === 'all' || taskType === 'listings') {
      results.listingsExpired = await expireListings();
    }

    if (taskType === 'all' || taskType === 'requests') {
      results.requestsExpired = await expireRequests();
    }

    if (taskType === 'all' || taskType === 'cashback') {
      results.cashbackReleased = await releasePendingCashback();
    }
  } catch (err) {
    console.error('Scheduler error:', err);
    results.errors.push(err.message);
  }

  console.log('Scheduler results:', results);
  return success(results);
}

/**
 * Expire old listings (STORY-007)
 */
async function expireListings() {
  const now = new Date().toISOString();
  let expiredCount = 0;

  // Get active listings
  const activeListings = await query(
    LISTINGS_TABLE,
    'status = :status',
    { ':status': 'active' },
    'status-index'
  );

  for (const listing of activeListings) {
    if (listing.expiresAt && listing.expiresAt < now) {
      try {
        // Update status to expired
        await updateItem(
          LISTINGS_TABLE,
          { id: listing.id },
          'SET #status = :expired, updatedAt = :now',
          {
            ':expired': 'expired',
            ':now': now,
          },
          { '#status': 'status' }
        );

        // Notify seller
        await notifyListingExpired(listing);

        expiredCount++;
        console.log(`Listing ${listing.id} expired`);
      } catch (err) {
        console.error(`Error expiring listing ${listing.id}:`, err);
      }
    }
  }

  return expiredCount;
}

/**
 * Expire old requests (STORY-016)
 */
async function expireRequests() {
  const now = new Date().toISOString();
  let expiredCount = 0;

  // Get active requests
  const activeRequests = await query(
    REQUESTS_TABLE,
    'status = :status',
    { ':status': 'active' },
    'status-index'
  );

  for (const request of activeRequests) {
    if (request.expiresAt && request.expiresAt < now) {
      try {
        // Update status to expired
        await updateItem(
          REQUESTS_TABLE,
          { id: request.id },
          'SET #status = :expired, updatedAt = :now',
          {
            ':expired': 'expired',
            ':now': now,
          },
          { '#status': 'status' }
        );

        // Notify user
        await notifyRequestExpired(request);

        expiredCount++;
        console.log(`Request ${request.id} expired`);
      } catch (err) {
        console.error(`Error expiring request ${request.id}:`, err);
      }
    }
  }

  return expiredCount;
}

/**
 * Release pending cashback after 30 days (STORY-035)
 */
async function releasePendingCashback() {
  const now = new Date().toISOString();
  let releasedCount = 0;

  // Query pending transactions with releaseDate <= now using GSI
  const pendingToRelease = await query(
    TRANSACTIONS_TABLE,
    '#status = :pending AND releaseDate <= :now',
    {
      ':pending': 'pending',
      ':now': now,
    },
    'status-releaseDate-index',
    { '#status': 'status' }
  );

  for (const transaction of pendingToRelease) {
    try {
      // Update transaction status
      await updateItem(
        TRANSACTIONS_TABLE,
        { transactionId: transaction.transactionId },
        'SET #status = :released, releasedAt = :now',
        {
          ':released': 'released',
          ':now': now,
        },
        { '#status': 'status' }
      );

      // Move from pending to available balance
      await updateItem(
        BALANCES_TABLE,
        { userId: transaction.userId },
        'SET pending = pending - :amount, available = if_not_exists(available, :zero) + :amount, lastUpdated = :now',
        {
          ':amount': transaction.amount,
          ':zero': 0,
          ':now': now,
        }
      );

      // Notify user
      await notifyCashbackReleased(transaction);

      releasedCount++;
      console.log(`Released cashback ${transaction.transactionId} for user ${transaction.userId}`);
    } catch (err) {
      console.error(`Error releasing cashback ${transaction.transactionId}:`, err);
    }
  }

  return releasedCount;
}

/**
 * Notify seller of listing expiration
 */
async function notifyListingExpired(listing) {
  const user = await getItem(USERS_TABLE, { userId: listing.userId });

  if (!user?.facebookId) return;

  const language = user.language || 'it';
  const messages = {
    it: `Il tuo annuncio "${listing.title}" e scaduto. Vuoi ripubblicarlo?`,
    en: `Your listing "${listing.title}" has expired. Want to republish it?`,
  };

  try {
    await sendMessage(user.facebookId, messages[language] || messages.it);
  } catch (err) {
    console.error(`Failed to notify listing expiration:`, err);
  }
}

/**
 * Notify user of request expiration
 */
async function notifyRequestExpired(request) {
  const user = await getItem(USERS_TABLE, { userId: request.userId });

  if (!user?.facebookId) return;

  const language = user.language || 'it';
  const messages = {
    it: `La tua richiesta per "${request.category}" e scaduta. Vuoi creare una nuova richiesta?`,
    en: `Your request for "${request.category}" has expired. Want to create a new request?`,
  };

  try {
    await sendMessage(user.facebookId, messages[language] || messages.it);
  } catch (err) {
    console.error(`Failed to notify request expiration:`, err);
  }
}

/**
 * Notify user of cashback release (STORY-058)
 */
async function notifyCashbackReleased(transaction) {
  const user = await getItem(USERS_TABLE, { userId: transaction.userId });

  if (!user?.facebookId) return;

  const language = user.language || 'it';
  const messages = {
    it: `Il tuo cashback di ${transaction.amount.toFixed(2)}€ e ora disponibile! Controlla il tuo saldo.`,
    en: `Your cashback of ${transaction.amount.toFixed(2)}€ is now available! Check your balance.`,
  };

  try {
    await sendMessage(user.facebookId, messages[language] || messages.it);
  } catch (err) {
    console.error(`Failed to notify cashback release:`, err);
  }
}

export default {
  handler,
  expireListings,
  expireRequests,
  releasePendingCashback,
};
