import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, updateItem, query } from '../../lib/dynamodb.js';
import { success, created, badRequest, notFound } from '../../lib/response.js';

const USERS_TABLE = process.env.USERS_TABLE;
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE;
const BALANCES_TABLE = process.env.BALANCES_TABLE;

/**
 * Referrals Service Handler (STORY-039, 040, 041, 042)
 * Routes: POST /referrals, GET /referrals/stats, POST /referrals/credit
 */
export async function handler(event) {
  console.log('Referrals handler:', JSON.stringify(event));

  const method = event.httpMethod;
  const path = event.path || '';

  try {
    // Register referral
    if (method === 'POST' && !path.includes('/credit') && !path.includes('/stats')) {
      return await registerReferral(event);
    }

    // Get referral stats
    if (method === 'GET' && path.includes('/stats')) {
      return await getReferralStats(event);
    }

    // Credit referral (internal - called on sale)
    if (method === 'POST' && path.includes('/credit')) {
      return await creditReferral(event);
    }

    // Get referral code
    if (method === 'GET' && path.includes('/code')) {
      return await getReferralCode(event);
    }

    // Get referred users
    if (method === 'GET' && !path.includes('/stats') && !path.includes('/code')) {
      return await getReferredUsers(event);
    }

    return badRequest('Unsupported operation');
  } catch (err) {
    console.error('Referrals error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

/**
 * Register a new referral (STORY-040)
 */
async function registerReferral(event) {
  const body = JSON.parse(event.body || '{}');
  const { newUserId, referrerCode } = body;

  if (!newUserId || !referrerCode) {
    return badRequest('newUserId and referrerCode are required');
  }

  // Find referrer by code
  const referrer = await findUserByReferralCode(referrerCode);

  if (!referrer) {
    return notFound('Invalid referral code');
  }

  // Prevent self-referral
  if (referrer.userId === newUserId) {
    return badRequest('Cannot refer yourself');
  }

  // Check if user already has a referrer
  const newUser = await getItem(USERS_TABLE, { userId: newUserId });

  if (!newUser) {
    return notFound('User not found');
  }

  if (newUser.referrerId) {
    return badRequest('User already has a referrer');
  }

  // Set referrer
  const now = new Date().toISOString();

  await updateItem(
    USERS_TABLE,
    { userId: newUserId },
    'SET referrerId = :referrerId, referredAt = :now, updatedAt = :now',
    {
      ':referrerId': referrer.userId,
      ':now': now,
    }
  );

  // Update referrer's stats
  await updateItem(
    USERS_TABLE,
    { userId: referrer.userId },
    'SET referralCount = if_not_exists(referralCount, :zero) + :one, updatedAt = :now',
    {
      ':zero': 0,
      ':one': 1,
      ':now': now,
    }
  );

  console.log(`User ${newUserId} referred by ${referrer.userId}`);

  return created({
    newUserId,
    referrerId: referrer.userId,
    referredAt: now,
  });
}

/**
 * Get referral statistics (STORY-042)
 */
async function getReferralStats(event) {
  const userId = event.requestContext?.authorizer?.userId ||
    event.queryStringParameters?.userId;

  if (!userId) {
    return badRequest('userId is required');
  }

  // Get user to find referral count
  const user = await getItem(USERS_TABLE, { userId });

  if (!user) {
    return notFound('User not found');
  }

  // Get referral transactions
  const transactions = await query(
    TRANSACTIONS_TABLE,
    'userId = :userId',
    { ':userId': userId },
    'userId-index'
  );

  const referralTx = transactions.filter(t => t.type === 'referrer_cashback');

  // Calculate stats
  const totalEarnings = referralTx.reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingEarnings = referralTx
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return success({
    userId,
    referralCode: user.referralCode || generateReferralCode(userId),
    referralCount: user.referralCount || 0,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    pendingEarnings: Math.round(pendingEarnings * 100) / 100,
    availableEarnings: Math.round((totalEarnings - pendingEarnings) * 100) / 100,
    recentTransactions: referralTx
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10),
  });
}

/**
 * Credit referrer on sale (STORY-041)
 */
async function creditReferral(event) {
  const body = JSON.parse(event.body || '{}');
  const { sellerId, saleAmount, paymentId } = body;

  if (!sellerId || !saleAmount || !paymentId) {
    return badRequest('sellerId, saleAmount, and paymentId are required');
  }

  // Get seller to find referrer
  const seller = await getItem(USERS_TABLE, { userId: sellerId });

  if (!seller) {
    return notFound('Seller not found');
  }

  if (!seller.referrerId) {
    return success({ credited: false, reason: 'Seller has no referrer' });
  }

  // Calculate referrer cashback (2% of sale amount)
  // Based on cashback structure: Quofind 10%, Buyer 66%, Leader 5%, Referrer 2%
  const referrerCashback = saleAmount * 0.02;

  if (referrerCashback <= 0) {
    return success({ credited: false, reason: 'Cashback amount too small' });
  }

  const now = new Date().toISOString();
  const releaseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Create transaction
  const transaction = {
    transactionId: uuidv4(),
    userId: seller.referrerId,
    amount: referrerCashback,
    type: 'referrer_cashback',
    status: 'pending',
    referenceId: paymentId,
    description: `Commissione referral da vendita`,
    sellerId,
    releaseDate,
    timestamp: now,
  };

  await putItem(TRANSACTIONS_TABLE, transaction);

  // Update referrer's pending balance
  await updateItem(
    BALANCES_TABLE,
    { userId: seller.referrerId },
    'SET pending = if_not_exists(pending, :zero) + :amount, lastUpdated = :now',
    {
      ':zero': 0,
      ':amount': referrerCashback,
      ':now': now,
    }
  );

  // Update referrer's stats
  await updateItem(
    USERS_TABLE,
    { userId: seller.referrerId },
    'SET totalReferralEarnings = if_not_exists(totalReferralEarnings, :zero) + :amount, updatedAt = :now',
    {
      ':zero': 0,
      ':amount': referrerCashback,
      ':now': now,
    }
  );

  console.log(`Credited ${referrerCashback}€ to referrer ${seller.referrerId} for sale by ${sellerId}`);

  return created({
    credited: true,
    referrerId: seller.referrerId,
    amount: referrerCashback,
    transactionId: transaction.transactionId,
  });
}

/**
 * Get user's referral code (STORY-039)
 */
async function getReferralCode(event) {
  const userId = event.requestContext?.authorizer?.userId;

  if (!userId) {
    return badRequest('Authentication required');
  }

  const user = await getItem(USERS_TABLE, { userId });

  if (!user) {
    return notFound('User not found');
  }

  // Generate code if not exists
  let referralCode = user.referralCode;

  if (!referralCode) {
    referralCode = generateReferralCode(userId);

    await updateItem(
      USERS_TABLE,
      { userId },
      'SET referralCode = :code, updatedAt = :now',
      {
        ':code': referralCode,
        ':now': new Date().toISOString(),
      }
    );
  }

  return success({
    referralCode,
    shareUrl: `https://quofind.com/ref/${referralCode}`,
  });
}

/**
 * Get list of referred users (STORY-042)
 */
async function getReferredUsers(event) {
  const userId = event.requestContext?.authorizer?.userId;

  if (!userId) {
    return badRequest('Authentication required');
  }

  // Query users with this referrerId
  // Note: In production, use GSI on referrerId
  const { scan } = await import('../../lib/dynamodb.js');
  const allUsers = await scan(USERS_TABLE);

  const referredUsers = allUsers
    .filter(u => u.referrerId === userId)
    .map(u => ({
      userId: u.userId,
      name: u.name || 'Unknown',
      referredAt: u.referredAt,
      totalSales: u.totalSales || 0,
    }));

  return success({
    referredUsers,
    total: referredUsers.length,
  });
}

/**
 * Find user by referral code
 */
async function findUserByReferralCode(code) {
  // Note: In production, use GSI on referralCode
  const { scan } = await import('../../lib/dynamodb.js');
  const allUsers = await scan(USERS_TABLE);
  return allUsers.find(u => u.referralCode === code);
}

/**
 * Generate referral code from userId
 */
function generateReferralCode(userId) {
  // Take last 6 chars of userId and uppercase
  const base = userId.replace(/-/g, '').slice(-6).toUpperCase();
  return `QF${base}`;
}

export default {
  handler,
  registerReferral,
  getReferralStats,
  creditReferral,
};
