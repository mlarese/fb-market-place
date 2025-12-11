import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, updateItem, query } from '../../lib/dynamodb.js';
import { success, created, badRequest, notFound } from '../../lib/response.js';

const BALANCES_TABLE = process.env.BALANCES_TABLE;
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE;
const CASHBACK_CONFIG_TABLE = process.env.CASHBACK_CONFIG_TABLE;
const GROUPS_TABLE = process.env.GROUPS_TABLE;

// Default config if not in DB
const DEFAULT_CONFIG = {
  id: 'default',
  quofindCommission: 0.10,    // 10% commission
  buyerCashback: 0.66,         // 66% of commission to buyer
  groupLeaderCashback: 0.05,   // 5% of commission to group leader
  referrerCashback: 0.02,      // 2% of commission to referrer
  pendingPeriodDays: 30,       // 30 days before release
};

/**
 * Cashback Service Handler (STORY-030, 031, 033)
 * Routes: GET /cashback/config, GET /cashback/balance, POST /cashback/calculate
 */
export async function handler(event) {
  console.log('Cashback handler:', JSON.stringify(event));

  const method = event.httpMethod;
  const path = event.path || '';

  try {
    // Get cashback config
    if (method === 'GET' && path.includes('/config')) {
      return await getCashbackConfig();
    }

    // Get user balance
    if (method === 'GET' && path.includes('/balance')) {
      return await getBalance(event);
    }

    // Get transaction history
    if (method === 'GET' && path.includes('/transactions')) {
      return await getTransactions(event);
    }

    // Calculate commission (internal)
    if (method === 'POST' && path.includes('/calculate')) {
      return await calculateCommission(event);
    }

    // Credit cashback (internal)
    if (method === 'POST' && path.includes('/credit')) {
      return await creditCashback(event);
    }

    // Distribute group cashback (internal)
    if (method === 'POST' && path.includes('/distribute-group')) {
      return await distributeGroupCashback(event);
    }

    return badRequest('Unsupported operation');
  } catch (err) {
    console.error('Cashback error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

/**
 * Get cashback configuration (STORY-030)
 */
async function getCashbackConfig() {
  let config = await getItem(CASHBACK_CONFIG_TABLE, { id: 'default' });

  if (!config) {
    // Create default config
    await putItem(CASHBACK_CONFIG_TABLE, DEFAULT_CONFIG);
    config = DEFAULT_CONFIG;
  }

  return success({
    quofindCommission: config.quofindCommission,
    buyerCashback: config.buyerCashback,
    groupLeaderCashback: config.groupLeaderCashback,
    referrerCashback: config.referrerCashback,
    pendingPeriodDays: config.pendingPeriodDays,
  });
}

/**
 * Get user's cashback balance (STORY-031)
 */
async function getBalance(event) {
  const userId = event.requestContext?.authorizer?.userId ||
    event.queryStringParameters?.userId;

  if (!userId) {
    return badRequest('userId is required');
  }

  let balance = await getItem(BALANCES_TABLE, { userId });

  if (!balance) {
    // Create initial balance record
    balance = {
      userId,
      available: 0,
      pending: 0,
      total: 0,
      lastUpdated: new Date().toISOString(),
    };
    await putItem(BALANCES_TABLE, balance);
  }

  return success({
    userId: balance.userId,
    available: balance.available || 0,
    pending: balance.pending || 0,
    total: (balance.available || 0) + (balance.pending || 0),
    lastUpdated: balance.lastUpdated,
  });
}

/**
 * Get user's transaction history (STORY-037)
 */
async function getTransactions(event) {
  const userId = event.requestContext?.authorizer?.userId ||
    event.queryStringParameters?.userId;

  if (!userId) {
    return badRequest('userId is required');
  }

  const params = event.queryStringParameters || {};
  const limit = parseInt(params.limit) || 50;

  const transactions = await query(
    TRANSACTIONS_TABLE,
    'userId = :userId',
    { ':userId': userId },
    'userId-index'
  );

  // Sort by timestamp descending
  transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return success({
    transactions: transactions.slice(0, limit),
    total: transactions.length,
  });
}

/**
 * Calculate commission for a sale (STORY-033)
 */
async function calculateCommission(event) {
  const body = JSON.parse(event.body || '{}');
  const { salePrice, groupId, referrerId } = body;

  if (!salePrice || salePrice <= 0) {
    return badRequest('Valid salePrice is required');
  }

  // Get config
  const configResponse = await getCashbackConfig();
  const config = JSON.parse(configResponse.body);

  // Calculate commission
  const commission = salePrice * config.quofindCommission;

  const breakdown = {
    salePrice,
    commission,
    quofindRevenue: commission, // Initially all to Quofind
    buyerCashback: commission * config.buyerCashback,
    groupLeaderCashback: 0,
    referrerCashback: 0,
  };

  // Adjust for group leader
  if (groupId) {
    breakdown.groupLeaderCashback = commission * config.groupLeaderCashback;
    breakdown.quofindRevenue -= breakdown.groupLeaderCashback;
  }

  // Adjust for referrer
  if (referrerId) {
    breakdown.referrerCashback = commission * config.referrerCashback;
    breakdown.quofindRevenue -= breakdown.referrerCashback;
  }

  // Subtract buyer cashback from Quofind revenue
  breakdown.quofindRevenue -= breakdown.buyerCashback;

  // Round all values
  Object.keys(breakdown).forEach(key => {
    if (typeof breakdown[key] === 'number') {
      breakdown[key] = Math.round(breakdown[key] * 100) / 100;
    }
  });

  return success(breakdown);
}

/**
 * Credit cashback to a user (internal use)
 */
async function creditCashback(event) {
  const body = JSON.parse(event.body || '{}');
  const { userId, amount, type, referenceId, description } = body;

  if (!userId || !amount || amount <= 0) {
    return badRequest('userId and positive amount are required');
  }

  const now = new Date().toISOString();
  const releaseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Create transaction record
  const transaction = {
    transactionId: uuidv4(),
    userId,
    amount,
    type: type || 'credit',
    status: 'pending',
    referenceId: referenceId || null,
    description: description || 'Cashback credit',
    releaseDate,
    timestamp: now,
  };

  await putItem(TRANSACTIONS_TABLE, transaction);

  // Update balance (add to pending)
  let balance = await getItem(BALANCES_TABLE, { userId });

  if (!balance) {
    balance = { userId, available: 0, pending: 0 };
  }

  await updateItem(
    BALANCES_TABLE,
    { userId },
    'SET pending = if_not_exists(pending, :zero) + :amount, lastUpdated = :now',
    {
      ':zero': 0,
      ':amount': amount,
      ':now': now,
    }
  );

  console.log(`Credited ${amount} to user ${userId} (pending)`);

  return created({
    transactionId: transaction.transactionId,
    userId,
    amount,
    status: 'pending',
    releaseDate,
  });
}

/**
 * Distribute cashback for a group sale (STORY-038)
 */
async function distributeGroupCashback(event) {
  const body = JSON.parse(event.body || '{}');
  const { groupId, salePrice, buyerId, sellerId, listingId } = body;

  if (!groupId || !salePrice || !buyerId) {
    return badRequest('groupId, salePrice, and buyerId are required');
  }

  // Get group info
  const group = await getItem(GROUPS_TABLE, { groupId });
  if (!group) {
    return notFound('Group not found');
  }

  // Calculate commission
  const calcEvent = {
    body: JSON.stringify({ salePrice, groupId }),
  };
  const calcResponse = await calculateCommission(calcEvent);
  const breakdown = JSON.parse(calcResponse.body);

  const results = {
    salePrice,
    groupId,
    distributions: [],
  };

  // Credit buyer
  if (breakdown.buyerCashback > 0) {
    const buyerCredit = await creditCashback({
      body: JSON.stringify({
        userId: buyerId,
        amount: breakdown.buyerCashback,
        type: 'buyer_cashback',
        referenceId: listingId,
        description: `Cashback acquisto - ${group.name}`,
      }),
    });
    results.distributions.push({
      userId: buyerId,
      role: 'buyer',
      amount: breakdown.buyerCashback,
      transactionId: JSON.parse(buyerCredit.body).transactionId,
    });
  }

  // Credit group leader
  if (breakdown.groupLeaderCashback > 0 && group.leaderId) {
    const leaderCredit = await creditCashback({
      body: JSON.stringify({
        userId: group.leaderId,
        amount: breakdown.groupLeaderCashback,
        type: 'leader_cashback',
        referenceId: listingId,
        description: `Commissione leader - ${group.name}`,
      }),
    });
    results.distributions.push({
      userId: group.leaderId,
      role: 'leader',
      amount: breakdown.groupLeaderCashback,
      transactionId: JSON.parse(leaderCredit.body).transactionId,
    });
  }

  // Update group stats
  await updateItem(
    GROUPS_TABLE,
    { groupId },
    'SET stats.totalSales = if_not_exists(stats.totalSales, :zero) + :one, stats.totalCashback = if_not_exists(stats.totalCashback, :zero) + :cashback, updatedAt = :now',
    {
      ':zero': 0,
      ':one': 1,
      ':cashback': breakdown.buyerCashback + breakdown.groupLeaderCashback,
      ':now': new Date().toISOString(),
    }
  );

  return success(results);
}

export default {
  handler,
  getCashbackConfig,
  getBalance,
  calculateCommission,
  creditCashback,
  distributeGroupCashback,
};
