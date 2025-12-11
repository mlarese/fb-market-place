import crypto from 'crypto';
import axios from 'axios';
import { getSecrets } from '../../lib/secrets.js';
import { getPost } from '../../lib/facebook.js';
import { sendMessage, sendListingConfirmation } from '../../lib/messenger.js';
import { success, badRequest, unauthorized } from '../../lib/response.js';

// n8n webhook URL (configured via environment or Secrets Manager)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

/**
 * Facebook Webhook Handler (STORY-064, STORY-065)
 * Routes events to appropriate handlers
 */
export async function handler(event) {
  console.log('Webhook received:', JSON.stringify(event));

  if (event.httpMethod === 'GET') {
    return handleVerification(event);
  }

  if (event.httpMethod === 'POST') {
    return handleEvent(event);
  }

  return badRequest('Unsupported method');
}

/**
 * Handle webhook verification from Facebook
 */
async function handleVerification(event) {
  const params = event.queryStringParameters || {};
  const mode = params['hub.mode'];
  const token = params['hub.verify_token'];
  const challenge = params['hub.challenge'];

  if (mode !== 'subscribe') {
    return badRequest('Invalid hub.mode');
  }

  const secrets = await getSecrets();
  const verifyToken = secrets.FACEBOOK_VERIFY_TOKEN;

  if (token !== verifyToken) {
    console.error('Verify token mismatch');
    return unauthorized('Invalid verify token');
  }

  console.log('Webhook verified successfully');
  return {
    statusCode: 200,
    body: challenge,
  };
}

/**
 * Handle incoming webhook events from Facebook
 */
async function handleEvent(event) {
  const secrets = await getSecrets();

  // Verify signature
  const signature = event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256'];
  if (!verifySignature(event.body, signature, secrets.FACEBOOK_APP_SECRET)) {
    console.error('Invalid signature');
    return unauthorized('Invalid signature');
  }

  const body = JSON.parse(event.body);

  // Facebook expects 200 OK quickly, process async
  if (body.object === 'page') {
    for (const entry of body.entry) {
      await processEntry(entry);
    }
  }

  return success({ status: 'EVENT_RECEIVED' });
}

/**
 * Verify Facebook webhook signature
 */
function verifySignature(payload, signature, appSecret) {
  if (!signature) return false;

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Process a single webhook entry (STORY-065 - Event Router)
 */
async function processEntry(entry) {
  const pageId = entry.id;
  const time = entry.time;

  console.log(`Processing entry from page ${pageId} at ${new Date(time).toISOString()}`);

  // Route messaging events to chatbot
  if (entry.messaging) {
    for (const messagingEvent of entry.messaging) {
      await routeMessagingEvent(messagingEvent);
    }
  }

  // Route feed events to listing workflow
  if (entry.changes) {
    for (const change of entry.changes) {
      await routeFeedChange(change);
    }
  }
}

/**
 * Route Messenger messaging event
 */
async function routeMessagingEvent(messagingEvent) {
  const senderId = messagingEvent.sender?.id;
  const recipientId = messagingEvent.recipient?.id;

  // Text message
  if (messagingEvent.message?.text) {
    const text = messagingEvent.message.text;
    console.log(`[MESSENGER] Text from ${senderId}: ${text}`);

    // Forward to n8n for AI processing
    await forwardToN8n('messenger_message', {
      senderId,
      text,
      timestamp: messagingEvent.timestamp,
    });
  }

  // Postback (button click)
  if (messagingEvent.postback) {
    const payload = messagingEvent.postback.payload;
    console.log(`[MESSENGER] Postback from ${senderId}: ${payload}`);

    await handlePostback(senderId, payload);
  }

  // Quick reply
  if (messagingEvent.message?.quick_reply) {
    const payload = messagingEvent.message.quick_reply.payload;
    console.log(`[MESSENGER] Quick reply from ${senderId}: ${payload}`);

    await handlePostback(senderId, payload);
  }
}

/**
 * Handle postback actions
 */
async function handlePostback(senderId, payload) {
  // Parse postback payload
  if (payload.startsWith('VIEW_LISTING_')) {
    const listingId = payload.replace('VIEW_LISTING_', '');
    await sendMessage(senderId, `Visualizza annuncio: ${listingId}`);
  } else if (payload.startsWith('DELETE_LISTING_')) {
    const listingId = payload.replace('DELETE_LISTING_', '');
    // Forward to delete handler
    await forwardToN8n('delete_listing', { senderId, listingId });
  } else if (payload.startsWith('CONTACT_SELLER_')) {
    const listingId = payload.replace('CONTACT_SELLER_', '');
    await forwardToN8n('contact_seller', { senderId, listingId });
  } else {
    // Forward unknown postbacks to n8n
    await forwardToN8n('postback', { senderId, payload });
  }
}

/**
 * Route feed change events (STORY-065)
 */
async function routeFeedChange(change) {
  const field = change.field;
  const value = change.value;

  console.log(`[FEED] Change on field: ${field}`);

  if (field === 'feed') {
    const item = value.item;
    const verb = value.verb;

    // New post - trigger listing creation workflow
    if (item === 'post' && verb === 'add') {
      await handleNewPost(value);
    }

    // Post edited
    if (item === 'post' && verb === 'edit') {
      console.log(`[FEED] Post edited: ${value.post_id}`);
      // Could update listing if needed
    }

    // Post deleted
    if (item === 'post' && verb === 'remove') {
      console.log(`[FEED] Post removed: ${value.post_id}`);
      await forwardToN8n('post_deleted', { postId: value.post_id });
    }

    // New comment
    if (item === 'comment' && verb === 'add') {
      console.log(`[FEED] New comment on ${value.post_id}`);
      // Could handle comment-based interactions
    }
  }
}

/**
 * Handle new Facebook post - trigger listing workflow (STORY-012 integration)
 */
async function handleNewPost(postData) {
  const postId = postData.post_id;
  const message = postData.message || '';
  const from = postData.from;

  console.log(`[NEW POST] ${postId} from ${from?.id}: ${message.substring(0, 100)}...`);

  // Fetch full post details (STORY-066)
  let fullPost = null;
  try {
    fullPost = await getPost(postId);
  } catch (err) {
    console.error('Failed to fetch full post:', err.message);
    fullPost = { id: postId, message, from };
  }

  // Forward to n8n workflow for AI analysis and listing creation
  await forwardToN8n('new_post', {
    postId,
    message: fullPost.message || message,
    from: from || fullPost.from,
    attachments: fullPost.attachments || [],
    createdTime: fullPost.createdTime || new Date().toISOString(),
  });
}

/**
 * Forward event to n8n webhook
 */
async function forwardToN8n(eventType, data) {
  if (!N8N_WEBHOOK_URL) {
    console.log(`[N8N] Webhook URL not configured, skipping forward for ${eventType}`);
    return;
  }

  try {
    const payload = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
    };

    await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });

    console.log(`[N8N] Forwarded ${eventType} event`);
  } catch (err) {
    console.error(`[N8N] Failed to forward ${eventType}:`, err.message);
    // Don't throw - we don't want to fail the webhook response
  }
}

export default { handler };
