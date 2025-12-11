import axios from 'axios';
import { getSecret } from './secrets.js';

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Send a text message via Messenger (STORY-053)
 */
export async function sendMessage(recipientId, text, options = {}) {
  const pageToken = await getSecret('FACEBOOK_PAGE_TOKEN');

  const payload = {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: options.messagingType || 'RESPONSE',
  };

  return await callMessengerAPI('/me/messages', payload, pageToken);
}

/**
 * Send a message with quick replies
 */
export async function sendQuickReplies(recipientId, text, quickReplies) {
  const pageToken = await getSecret('FACEBOOK_PAGE_TOKEN');

  const payload = {
    recipient: { id: recipientId },
    message: {
      text,
      quick_replies: quickReplies.map(qr => ({
        content_type: 'text',
        title: qr.title,
        payload: qr.payload,
      })),
    },
  };

  return await callMessengerAPI('/me/messages', payload, pageToken);
}

/**
 * Send a message with buttons
 */
export async function sendButtons(recipientId, text, buttons) {
  const pageToken = await getSecret('FACEBOOK_PAGE_TOKEN');

  const payload = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text,
          buttons: buttons.map(btn => {
            if (btn.url) {
              return { type: 'web_url', url: btn.url, title: btn.title };
            }
            return { type: 'postback', title: btn.title, payload: btn.payload };
          }),
        },
      },
    },
  };

  return await callMessengerAPI('/me/messages', payload, pageToken);
}

/**
 * Send a generic template (cards)
 */
export async function sendCards(recipientId, elements) {
  const pageToken = await getSecret('FACEBOOK_PAGE_TOKEN');

  const payload = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements.map(el => ({
            title: el.title,
            subtitle: el.subtitle,
            image_url: el.imageUrl,
            buttons: el.buttons?.map(btn => {
              if (btn.url) {
                return { type: 'web_url', url: btn.url, title: btn.title };
              }
              return { type: 'postback', title: btn.title, payload: btn.payload };
            }),
          })),
        },
      },
    },
  };

  return await callMessengerAPI('/me/messages', payload, pageToken);
}

/**
 * Send listing confirmation message (STORY-054)
 */
export async function sendListingConfirmation(recipientId, listing, language = 'it') {
  const messages = {
    it: {
      title: 'Annuncio pubblicato!',
      subtitle: `${listing.title}\nPrezzo: ${listing.price} ${listing.currency}\nCategoria: ${listing.category}`,
      viewButton: 'Visualizza',
      deleteButton: 'Elimina',
    },
    en: {
      title: 'Listing published!',
      subtitle: `${listing.title}\nPrice: ${listing.price} ${listing.currency}\nCategory: ${listing.category}`,
      viewButton: 'View',
      deleteButton: 'Delete',
    },
  };

  const msg = messages[language] || messages.it;

  return await sendButtons(recipientId, `${msg.title}\n\n${msg.subtitle}`, [
    { title: msg.viewButton, payload: `VIEW_LISTING_${listing.id}` },
    { title: msg.deleteButton, payload: `DELETE_LISTING_${listing.id}` },
  ]);
}

/**
 * Send match notification to buyer
 */
export async function sendMatchNotification(recipientId, listing, language = 'it') {
  const messages = {
    it: {
      title: 'Trovato un annuncio per te!',
      price: `Prezzo: ${listing.price} ${listing.currency}`,
      location: listing.localita ? `Zona: ${listing.localita}` : '',
      contactButton: 'Contatta venditore',
    },
    en: {
      title: 'Found a listing for you!',
      price: `Price: ${listing.price} ${listing.currency}`,
      location: listing.localita ? `Location: ${listing.localita}` : '',
      contactButton: 'Contact seller',
    },
  };

  const msg = messages[language] || messages.it;
  const subtitle = [listing.description?.substring(0, 80), msg.price, msg.location]
    .filter(Boolean)
    .join('\n');

  return await sendCards(recipientId, [{
    title: listing.title,
    subtitle,
    imageUrl: listing.images?.[0],
    buttons: [
      { title: msg.contactButton, payload: `CONTACT_SELLER_${listing.id}` },
    ],
  }]);
}

/**
 * Call Messenger Send API
 */
async function callMessengerAPI(endpoint, payload, pageToken) {
  try {
    const response = await axios.post(
      `${GRAPH_API_URL}${endpoint}`,
      payload,
      {
        params: { access_token: pageToken },
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return { success: true, messageId: response.data.message_id };
  } catch (error) {
    console.error('Messenger API error:', error.response?.data || error.message);

    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      console.log(`Rate limited. Retry after ${retryAfter}s`);
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}

export default {
  sendMessage,
  sendQuickReplies,
  sendButtons,
  sendCards,
  sendListingConfirmation,
  sendMatchNotification,
};
