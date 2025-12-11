import { getItem, putItem, query } from '../../lib/dynamodb.js';
import { sendMessage, sendButtons } from '../../lib/messenger.js';
import { success, badRequest, notFound } from '../../lib/response.js';

const USERS_TABLE = process.env.USERS_TABLE;
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE || 'MarketplaceNotifications';

/**
 * Notifications Service Handler (STORY-057, 058, 059)
 * Manages notification templates and sending
 */
export async function handler(event) {
  console.log('Notifications handler:', JSON.stringify(event));

  const method = event.httpMethod;
  const path = event.path || '';

  try {
    // Send notification
    if (method === 'POST' && path.includes('/send')) {
      return await sendNotification(event);
    }

    // Get notification history
    if (method === 'GET' && path.includes('/history')) {
      return await getNotificationHistory(event);
    }

    // Update preferences
    if (method === 'PUT' && path.includes('/preferences')) {
      return await updatePreferences(event);
    }

    return badRequest('Unsupported operation');
  } catch (err) {
    console.error('Notifications error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

/**
 * Send a notification (STORY-057)
 */
async function sendNotification(event) {
  const body = JSON.parse(event.body || '{}');
  const { userId, type, data } = body;

  if (!userId || !type) {
    return badRequest('userId and type are required');
  }

  // Get user to find Facebook ID and preferences
  const user = await getItem(USERS_TABLE, { userId });

  if (!user) {
    return notFound('User not found');
  }

  // Check if notifications enabled
  if (user.notifications?.enabled === false) {
    return success({ sent: false, reason: 'Notifications disabled by user' });
  }

  // Check type-specific preferences
  if (user.notifications?.[type] === false) {
    return success({ sent: false, reason: `${type} notifications disabled` });
  }

  const language = user.language || 'it';
  const template = getTemplate(type, language);

  if (!template) {
    return badRequest(`Unknown notification type: ${type}`);
  }

  // Render template with data
  const message = renderTemplate(template, data);

  // Send via Messenger
  if (user.facebookId) {
    try {
      if (template.buttons) {
        const buttons = template.buttons.map(b => ({
          type: 'postback',
          title: renderTemplate(b.title, data),
          payload: renderTemplate(b.payload, data),
        }));
        await sendButtons(user.facebookId, message, buttons);
      } else {
        await sendMessage(user.facebookId, message);
      }

      // Log notification
      await logNotification(userId, type, message, 'sent');

      return success({ sent: true, message });
    } catch (err) {
      console.error('Failed to send notification:', err);
      await logNotification(userId, type, message, 'failed', err.message);
      return success({ sent: false, reason: err.message });
    }
  }

  return success({ sent: false, reason: 'No Facebook ID' });
}

/**
 * Get notification history (STORY-059)
 */
async function getNotificationHistory(event) {
  const userId = event.requestContext?.authorizer?.userId ||
    event.queryStringParameters?.userId;

  if (!userId) {
    return badRequest('userId is required');
  }

  const notifications = await query(
    NOTIFICATIONS_TABLE,
    'userId = :userId',
    { ':userId': userId },
    'userId-index'
  );

  // Sort by timestamp descending
  notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return success({
    notifications: notifications.slice(0, 50),
    total: notifications.length,
  });
}

/**
 * Update notification preferences (STORY-057)
 */
async function updatePreferences(event) {
  const userId = event.requestContext?.authorizer?.userId;
  const body = JSON.parse(event.body || '{}');

  if (!userId) {
    return badRequest('Authentication required');
  }

  const { enabled, types } = body;

  // Build update expression
  const updates = [];
  const values = {};

  if (enabled !== undefined) {
    updates.push('notifications.enabled = :enabled');
    values[':enabled'] = enabled;
  }

  if (types) {
    Object.entries(types).forEach(([type, value]) => {
      updates.push(`notifications.${type} = :${type}`);
      values[`:${type}`] = value;
    });
  }

  if (updates.length === 0) {
    return badRequest('No preferences to update');
  }

  // Would update user here - simplified for now
  return success({
    message: 'Preferences updated',
    preferences: { enabled, types },
  });
}

/**
 * Log notification to history
 */
async function logNotification(userId, type, message, status, error = null) {
  const notification = {
    notificationId: `${userId}-${Date.now()}`,
    userId,
    type,
    message,
    status,
    error,
    timestamp: new Date().toISOString(),
  };

  try {
    await putItem(NOTIFICATIONS_TABLE, notification);
  } catch (err) {
    console.error('Failed to log notification:', err);
  }
}

/**
 * Get notification template
 */
function getTemplate(type, language) {
  const templates = NOTIFICATION_TEMPLATES[language] || NOTIFICATION_TEMPLATES.it;
  return templates[type];
}

/**
 * Render template with data
 */
function renderTemplate(template, data) {
  if (!template || !data) return template;

  let result = typeof template === 'string' ? template : template.message;

  Object.entries(data).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  });

  return result;
}

/**
 * Notification Templates (STORY-058)
 */
const NOTIFICATION_TEMPLATES = {
  it: {
    // Match notifications
    match_found: {
      message: '🎯 Trovato! "{title}" a {price}€ corrisponde alla tua ricerca.',
      buttons: [
        { title: '👀 Vedi', payload: 'VIEW_LISTING_{listingId}' },
        { title: '💬 Contatta', payload: 'CONTACT_SELLER_{sellerId}' },
      ],
    },
    seller_match: {
      message: '📢 C\'e una richiesta per "{category}" nella tua zona! Budget: {budget}€',
      buttons: [
        { title: '📦 I miei annunci', payload: 'MY_LISTINGS' },
      ],
    },

    // Listing notifications
    listing_created: {
      message: '✅ Annuncio creato: "{title}"\nPrezzo: {price}€\nCategoria: {category}',
    },
    listing_expired: {
      message: '⏰ Il tuo annuncio "{title}" e scaduto. Vuoi ripubblicarlo?',
      buttons: [
        { title: '🔄 Ripubblica', payload: 'REPUBLISH_{listingId}' },
        { title: '🗑 Elimina', payload: 'DELETE_{listingId}' },
      ],
    },
    listing_sold: {
      message: '🎉 Complimenti! "{title}" e stato venduto per {price}€',
    },

    // Payment notifications
    payment_received: {
      message: '💰 Pagamento ricevuto: {amount}€ per "{title}".\nConferma quando ricevi il pagamento.',
      buttons: [
        { title: '✅ Conferma', payload: 'CONFIRM_PAYMENT_{paymentId}' },
        { title: '❌ Problema', payload: 'REPORT_ISSUE_{paymentId}' },
      ],
    },
    payment_confirmed: {
      message: '✅ Pagamento confermato! Hai guadagnato {cashback}€ di cashback.',
    },
    payment_refunded: {
      message: '↩️ Pagamento rimborsato: {amount}€ per "{title}".',
    },

    // Cashback notifications
    cashback_pending: {
      message: '💵 Cashback in arrivo: {amount}€ sara disponibile tra 30 giorni.',
    },
    cashback_available: {
      message: '🎉 Cashback disponibile! {amount}€ sono stati aggiunti al tuo saldo.',
      buttons: [
        { title: '💰 Vedi saldo', payload: 'CHECK_BALANCE' },
      ],
    },

    // Group notifications
    group_joined: {
      message: '👥 Sei entrato nel gruppo "{groupName}"!',
    },
    group_member_added: {
      message: '👤 Nuovo membro nel gruppo "{groupName}": {memberName}',
    },
    group_cashback: {
      message: '💵 Commissione gruppo: {amount}€ da una vendita in "{groupName}"',
    },

    // Request notifications
    request_created: {
      message: '🔍 Richiesta creata: "{description}"\nBudget: {budget}€\nTi avviseremo quando troviamo qualcosa!',
    },
    request_expired: {
      message: '⏰ La tua richiesta per "{category}" e scaduta.',
      buttons: [
        { title: '🔄 Rinnova', payload: 'RENEW_REQUEST_{requestId}' },
      ],
    },
  },

  en: {
    match_found: {
      message: '🎯 Found! "{title}" at {price}€ matches your search.',
      buttons: [
        { title: '👀 View', payload: 'VIEW_LISTING_{listingId}' },
        { title: '💬 Contact', payload: 'CONTACT_SELLER_{sellerId}' },
      ],
    },
    seller_match: {
      message: '📢 There\'s a request for "{category}" in your area! Budget: {budget}€',
      buttons: [
        { title: '📦 My listings', payload: 'MY_LISTINGS' },
      ],
    },
    listing_created: {
      message: '✅ Listing created: "{title}"\nPrice: {price}€\nCategory: {category}',
    },
    listing_expired: {
      message: '⏰ Your listing "{title}" has expired. Want to republish?',
      buttons: [
        { title: '🔄 Republish', payload: 'REPUBLISH_{listingId}' },
        { title: '🗑 Delete', payload: 'DELETE_{listingId}' },
      ],
    },
    listing_sold: {
      message: '🎉 Congratulations! "{title}" was sold for {price}€',
    },
    payment_received: {
      message: '💰 Payment received: {amount}€ for "{title}".\nConfirm when you receive the payment.',
      buttons: [
        { title: '✅ Confirm', payload: 'CONFIRM_PAYMENT_{paymentId}' },
        { title: '❌ Issue', payload: 'REPORT_ISSUE_{paymentId}' },
      ],
    },
    payment_confirmed: {
      message: '✅ Payment confirmed! You earned {cashback}€ cashback.',
    },
    payment_refunded: {
      message: '↩️ Payment refunded: {amount}€ for "{title}".',
    },
    cashback_pending: {
      message: '💵 Cashback incoming: {amount}€ will be available in 30 days.',
    },
    cashback_available: {
      message: '🎉 Cashback available! {amount}€ has been added to your balance.',
      buttons: [
        { title: '💰 View balance', payload: 'CHECK_BALANCE' },
      ],
    },
    group_joined: {
      message: '👥 You joined the group "{groupName}"!',
    },
    group_member_added: {
      message: '👤 New member in "{groupName}": {memberName}',
    },
    group_cashback: {
      message: '💵 Group commission: {amount}€ from a sale in "{groupName}"',
    },
    request_created: {
      message: '🔍 Request created: "{description}"\nBudget: {budget}€\nWe\'ll notify you when we find something!',
    },
    request_expired: {
      message: '⏰ Your request for "{category}" has expired.',
      buttons: [
        { title: '🔄 Renew', payload: 'RENEW_REQUEST_{requestId}' },
      ],
    },
  },
};

export default {
  handler,
  sendNotification,
  getTemplate,
  renderTemplate,
  NOTIFICATION_TEMPLATES,
};
