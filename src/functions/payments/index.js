import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, updateItem, query } from '../../lib/dynamodb.js';
import { sendMessage } from '../../lib/messenger.js';
import { success, created, badRequest, notFound, forbidden } from '../../lib/response.js';

const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE || 'MarketplacePayments';
const LISTINGS_TABLE = process.env.LISTINGS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const BALANCES_TABLE = process.env.BALANCES_TABLE;
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE;
const GROUPS_TABLE = process.env.GROUPS_TABLE;

/**
 * Payments Service Handler (STORY-032, 034, 035, 036)
 * Routes: POST /payments, GET /payments/{id}, POST /payments/{id}/confirm, POST /payments/{id}/refund
 */
export async function handler(event) {
  console.log('Payments handler:', JSON.stringify(event));

  const method = event.httpMethod;
  const path = event.path || '';
  const pathParams = event.pathParameters || {};
  const paymentId = pathParams.id || pathParams.paymentId;

  try {
    // Initiate payment
    if (method === 'POST' && !paymentId) {
      return await initiatePayment(event);
    }

    // Get payment status
    if (method === 'GET' && paymentId) {
      return await getPaymentStatus(paymentId, event);
    }

    // Confirm payment (seller confirms receipt)
    if (method === 'POST' && paymentId && path.includes('/confirm')) {
      return await confirmPayment(paymentId, event);
    }

    // Refund/rollback payment
    if (method === 'POST' && paymentId && path.includes('/refund')) {
      return await refundPayment(paymentId, event);
    }

    // Get user's payments
    if (method === 'GET' && !paymentId) {
      return await getUserPayments(event);
    }

    return badRequest('Unsupported operation');
  } catch (err) {
    console.error('Payments error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

/**
 * Initiate a payment (STORY-032)
 */
async function initiatePayment(event) {
  const body = JSON.parse(event.body || '{}');
  const buyerId = event.requestContext?.authorizer?.userId || body.buyerId;

  const { listingId, amount, groupId } = body;

  if (!buyerId || !listingId || !amount) {
    return badRequest('buyerId, listingId, and amount are required');
  }

  // Get listing to verify it exists and get seller
  const listing = await getItem(LISTINGS_TABLE, { id: listingId });
  if (!listing) {
    return notFound('Listing not found');
  }

  if (listing.status !== 'active') {
    return badRequest('Listing is no longer available');
  }

  const now = new Date().toISOString();

  // Calculate commission breakdown
  const commission = amount * 0.10; // 10% commission
  const breakdown = {
    salePrice: amount,
    commission,
    buyerCashback: commission * 0.66,
    groupLeaderCashback: groupId ? commission * 0.05 : 0,
    sellerPayout: amount - commission,
  };

  const payment = {
    paymentId: uuidv4(),
    listingId,
    buyerId,
    sellerId: listing.userId,
    groupId: groupId || null,
    amount,
    breakdown,
    status: 'pending', // pending -> confirmed -> completed OR refunded
    createdAt: now,
    updatedAt: now,
  };

  await putItem(PAYMENTS_TABLE, payment);

  // Update listing status to reserved
  await updateItem(
    LISTINGS_TABLE,
    { id: listingId },
    'SET #status = :reserved, reservedBy = :buyer, reservedAt = :now, updatedAt = :now',
    {
      ':reserved': 'reserved',
      ':buyer': buyerId,
      ':now': now,
    },
    { '#status': 'status' }
  );

  console.log(`Payment ${payment.paymentId} initiated for listing ${listingId}`);

  // Notify seller
  await notifyPaymentInitiated(payment, listing);

  return created(payment);
}

/**
 * Get payment status (STORY-034)
 */
async function getPaymentStatus(paymentId, event) {
  const payment = await getItem(PAYMENTS_TABLE, { paymentId });

  if (!payment) {
    return notFound('Payment not found');
  }

  const userId = event.requestContext?.authorizer?.userId;

  // Only buyer or seller can view
  if (userId && userId !== payment.buyerId && userId !== payment.sellerId) {
    return forbidden('Access denied');
  }

  return success(payment);
}

/**
 * Confirm payment completion (STORY-034)
 */
async function confirmPayment(paymentId, event) {
  const payment = await getItem(PAYMENTS_TABLE, { paymentId });

  if (!payment) {
    return notFound('Payment not found');
  }

  const userId = event.requestContext?.authorizer?.userId;

  // Only seller can confirm
  if (userId !== payment.sellerId) {
    return forbidden('Only seller can confirm payment');
  }

  if (payment.status !== 'pending') {
    return badRequest(`Cannot confirm payment with status: ${payment.status}`);
  }

  const now = new Date().toISOString();

  // Update payment status
  await updateItem(
    PAYMENTS_TABLE,
    { paymentId },
    'SET #status = :confirmed, confirmedAt = :now, updatedAt = :now',
    {
      ':confirmed': 'confirmed',
      ':now': now,
    },
    { '#status': 'status' }
  );

  // Mark listing as sold
  await updateItem(
    LISTINGS_TABLE,
    { id: payment.listingId },
    'SET #status = :sold, soldAt = :now, soldTo = :buyer, updatedAt = :now',
    {
      ':sold': 'sold',
      ':now': now,
      ':buyer': payment.buyerId,
    },
    { '#status': 'status' }
  );

  // Distribute cashback (STORY-035, 036)
  await distributeCashback(payment);

  // Notify buyer
  await notifyPaymentConfirmed(payment);

  console.log(`Payment ${paymentId} confirmed`);

  return success({
    paymentId,
    status: 'confirmed',
    message: 'Payment confirmed and cashback distributed',
  });
}

/**
 * Refund/rollback payment (STORY-036)
 */
async function refundPayment(paymentId, event) {
  const body = JSON.parse(event.body || '{}');
  const payment = await getItem(PAYMENTS_TABLE, { paymentId });

  if (!payment) {
    return notFound('Payment not found');
  }

  const userId = event.requestContext?.authorizer?.userId;

  // Only buyer, seller, or admin can refund
  if (userId !== payment.buyerId && userId !== payment.sellerId) {
    return forbidden('Access denied');
  }

  if (payment.status === 'refunded') {
    return badRequest('Payment already refunded');
  }

  const now = new Date().toISOString();

  // Update payment status
  await updateItem(
    PAYMENTS_TABLE,
    { paymentId },
    'SET #status = :refunded, refundedAt = :now, refundReason = :reason, updatedAt = :now',
    {
      ':refunded': 'refunded',
      ':now': now,
      ':reason': body.reason || 'User requested refund',
    },
    { '#status': 'status' }
  );

  // Restore listing to active
  await updateItem(
    LISTINGS_TABLE,
    { id: payment.listingId },
    'SET #status = :active, reservedBy = :null, reservedAt = :null, updatedAt = :now',
    {
      ':active': 'active',
      ':null': null,
      ':now': now,
    },
    { '#status': 'status' }
  );

  // If cashback was distributed, rollback (STORY-036)
  if (payment.status === 'confirmed') {
    await rollbackCashback(payment);
  }

  // Notify parties
  await notifyPaymentRefunded(payment);

  console.log(`Payment ${paymentId} refunded`);

  return success({
    paymentId,
    status: 'refunded',
    message: 'Payment refunded successfully',
  });
}

/**
 * Get user's payment history (STORY-037)
 */
async function getUserPayments(event) {
  const userId = event.requestContext?.authorizer?.userId;

  if (!userId) {
    return badRequest('Authentication required');
  }

  const params = event.queryStringParameters || {};
  const role = params.role || 'all'; // buyer, seller, or all

  // Query payments using GSIs - DynamoDB doesn't support OR in KeyCondition
  const [buyerPayments, sellerPayments] = await Promise.all([
    query(PAYMENTS_TABLE, 'buyerId = :userId', { ':userId': userId }, 'buyerId-index'),
    query(PAYMENTS_TABLE, 'sellerId = :userId', { ':userId': userId }, 'sellerId-index'),
  ]);

  // Merge and dedupe by paymentId
  const paymentMap = new Map();
  [...buyerPayments, ...sellerPayments].forEach(p => paymentMap.set(p.paymentId, p));
  let payments = Array.from(paymentMap.values());

  if (role === 'buyer') {
    payments = payments.filter(p => p.buyerId === userId);
  } else if (role === 'seller') {
    payments = payments.filter(p => p.sellerId === userId);
  }

  // Sort by date descending
  payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return success({
    payments: payments.slice(0, 50),
    total: payments.length,
  });
}

/**
 * Distribute cashback after confirmed payment (STORY-035)
 */
async function distributeCashback(payment) {
  const { breakdown, buyerId, groupId } = payment;
  const now = new Date().toISOString();
  const releaseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Credit buyer cashback
  if (breakdown.buyerCashback > 0) {
    const buyerTx = {
      transactionId: uuidv4(),
      userId: buyerId,
      amount: breakdown.buyerCashback,
      type: 'buyer_cashback',
      status: 'pending',
      referenceId: payment.paymentId,
      description: 'Cashback acquisto',
      releaseDate,
      timestamp: now,
    };
    await putItem(TRANSACTIONS_TABLE, buyerTx);

    await updateItem(
      BALANCES_TABLE,
      { userId: buyerId },
      'SET pending = if_not_exists(pending, :zero) + :amount, lastUpdated = :now',
      { ':zero': 0, ':amount': breakdown.buyerCashback, ':now': now }
    );
  }

  // Credit group leader cashback
  if (breakdown.groupLeaderCashback > 0 && groupId) {
    const group = await getItem(GROUPS_TABLE, { groupId });
    if (group?.leaderId) {
      const leaderTx = {
        transactionId: uuidv4(),
        userId: group.leaderId,
        amount: breakdown.groupLeaderCashback,
        type: 'leader_cashback',
        status: 'pending',
        referenceId: payment.paymentId,
        description: `Commissione leader - ${group.name}`,
        releaseDate,
        timestamp: now,
      };
      await putItem(TRANSACTIONS_TABLE, leaderTx);

      await updateItem(
        BALANCES_TABLE,
        { userId: group.leaderId },
        'SET pending = if_not_exists(pending, :zero) + :amount, lastUpdated = :now',
        { ':zero': 0, ':amount': breakdown.groupLeaderCashback, ':now': now }
      );

      // Update group stats
      await updateItem(
        GROUPS_TABLE,
        { groupId },
        'SET stats.totalSales = if_not_exists(stats.totalSales, :zero) + :one, stats.totalCashback = if_not_exists(stats.totalCashback, :zero) + :cashback, updatedAt = :now',
        {
          ':zero': 0,
          ':one': 1,
          ':cashback': breakdown.groupLeaderCashback,
          ':now': now,
        }
      );
    }
  }

  console.log(`Cashback distributed for payment ${payment.paymentId}`);
}

/**
 * Rollback cashback on refund (STORY-036)
 */
async function rollbackCashback(payment) {
  const now = new Date().toISOString();

  // Find and reverse transactions for this payment
  const transactions = await query(
    TRANSACTIONS_TABLE,
    'referenceId = :paymentId',
    { ':paymentId': payment.paymentId },
    'referenceId-index'
  );

  for (const tx of transactions) {
    if (tx.status === 'pending') {
      // Mark transaction as cancelled
      await updateItem(
        TRANSACTIONS_TABLE,
        { transactionId: tx.transactionId },
        'SET #status = :cancelled, cancelledAt = :now',
        { ':cancelled': 'cancelled', ':now': now },
        { '#status': 'status' }
      );

      // Subtract from pending balance
      await updateItem(
        BALANCES_TABLE,
        { userId: tx.userId },
        'SET pending = pending - :amount, lastUpdated = :now',
        { ':amount': tx.amount, ':now': now }
      );
    } else if (tx.status === 'released') {
      // Create debit transaction
      const debitTx = {
        transactionId: uuidv4(),
        userId: tx.userId,
        amount: -tx.amount,
        type: 'rollback',
        status: 'completed',
        referenceId: payment.paymentId,
        description: 'Rimborso cashback',
        timestamp: now,
      };
      await putItem(TRANSACTIONS_TABLE, debitTx);

      // Subtract from available balance
      await updateItem(
        BALANCES_TABLE,
        { userId: tx.userId },
        'SET available = available - :amount, lastUpdated = :now',
        { ':amount': tx.amount, ':now': now }
      );
    }
  }

  console.log(`Cashback rolled back for payment ${payment.paymentId}`);
}

/**
 * Notify seller of new payment
 */
async function notifyPaymentInitiated(payment, listing) {
  const seller = await getItem(USERS_TABLE, { userId: payment.sellerId });
  if (!seller?.facebookId) return;

  const lang = seller.language || 'it';
  const messages = {
    it: `Nuovo acquisto! "${listing.title}" per ${payment.amount}€. Conferma quando ricevi il pagamento.`,
    en: `New purchase! "${listing.title}" for ${payment.amount}€. Confirm when you receive payment.`,
  };

  try {
    await sendMessage(seller.facebookId, messages[lang]);
  } catch (err) {
    console.error('Failed to notify seller:', err);
  }
}

/**
 * Notify buyer of payment confirmation
 */
async function notifyPaymentConfirmed(payment) {
  const buyer = await getItem(USERS_TABLE, { userId: payment.buyerId });
  if (!buyer?.facebookId) return;

  const lang = buyer.language || 'it';
  const messages = {
    it: `Pagamento confermato! Hai guadagnato ${payment.breakdown.buyerCashback.toFixed(2)}€ di cashback (disponibile tra 30 giorni).`,
    en: `Payment confirmed! You earned ${payment.breakdown.buyerCashback.toFixed(2)}€ cashback (available in 30 days).`,
  };

  try {
    await sendMessage(buyer.facebookId, messages[lang]);
  } catch (err) {
    console.error('Failed to notify buyer:', err);
  }
}

/**
 * Notify parties of refund
 */
async function notifyPaymentRefunded(payment) {
  const [buyer, seller] = await Promise.all([
    getItem(USERS_TABLE, { userId: payment.buyerId }),
    getItem(USERS_TABLE, { userId: payment.sellerId }),
  ]);

  const messages = {
    it: 'Il pagamento e stato rimborsato.',
    en: 'The payment has been refunded.',
  };

  const notifications = [];
  if (buyer?.facebookId) {
    notifications.push(sendMessage(buyer.facebookId, messages[buyer.language || 'it']));
  }
  if (seller?.facebookId) {
    notifications.push(sendMessage(seller.facebookId, messages[seller.language || 'it']));
  }

  await Promise.allSettled(notifications);
}

export default {
  handler,
  initiatePayment,
  confirmPayment,
  refundPayment,
  distributeCashback,
  rollbackCashback,
};
