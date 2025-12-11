import OpenAI from 'openai';
import { getSecret } from '../../lib/secrets.js';
import { getItem, query } from '../../lib/dynamodb.js';
import { sendMessage, sendButtons } from '../../lib/messenger.js';
import { success, badRequest } from '../../lib/response.js';

const USERS_TABLE = process.env.USERS_TABLE;
const BALANCES_TABLE = process.env.BALANCES_TABLE;
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE;
const GROUPS_TABLE = process.env.GROUPS_TABLE;
const LISTINGS_TABLE = process.env.LISTINGS_TABLE;

let openaiClient = null;

/**
 * Chatbot Message Handler (STORY-046, 047, 048)
 * Processes user messages and responds with relevant information
 */
export async function handler(event) {
  console.log('Chatbot message handler:', JSON.stringify(event));

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, facebookId, message, language = 'it' } = body;

    if (!message) {
      return badRequest('Message is required');
    }

    // Analyze intent
    const intent = await analyzeIntent(message, language);
    console.log('Detected intent:', intent);

    // Fetch relevant data
    const data = await fetchData(intent, userId);

    // Format and send response
    const response = formatResponse(intent, data, language);

    // Send via Messenger if facebookId provided
    if (facebookId) {
      await sendChatbotResponse(facebookId, response, intent);
    }

    return success({
      intent,
      response,
      data,
    });
  } catch (err) {
    console.error('Chatbot error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

/**
 * Initialize OpenAI client
 */
async function getOpenAIClient() {
  if (openaiClient) return openaiClient;
  const apiKey = await getSecret('OPENAI_API_KEY');
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/**
 * Analyze user intent using OpenAI (STORY-049)
 */
async function analyzeIntent(message, language) {
  const client = await getOpenAIClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: INTENT_ANALYSIS_PROMPT },
      { role: 'user', content: message },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content;
  return JSON.parse(content || '{"intent": "unknown"}');
}

/**
 * Fetch data based on intent (STORY-050)
 */
async function fetchData(intent, userId) {
  const data = {};

  switch (intent.intent) {
    case 'check_balance':
      data.balance = await getItem(BALANCES_TABLE, { userId });
      if (!data.balance) {
        data.balance = { available: 0, pending: 0 };
      }
      break;

    case 'transaction_history':
      const limit = intent.params?.limit || 10;
      const transactions = await query(
        TRANSACTIONS_TABLE,
        'userId = :userId',
        { ':userId': userId },
        'userId-index'
      );
      data.transactions = transactions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
      break;

    case 'group_info':
      if (intent.params?.groupId) {
        data.group = await getItem(GROUPS_TABLE, { groupId: intent.params.groupId });
      } else {
        // Get user's groups - scan and filter by membership
        // Note: In production, use GSI on userId for members
        const { scan } = await import('../../lib/dynamodb.js');
        const allGroups = await scan(GROUPS_TABLE);
        data.groups = allGroups.filter(g => g.members?.includes(userId));
      }
      break;

    case 'listing_status':
      if (intent.params?.listingId) {
        data.listing = await getItem(LISTINGS_TABLE, { id: intent.params.listingId });
      } else {
        // Get user's listings
        const listings = await query(
          LISTINGS_TABLE,
          'userId = :userId',
          { ':userId': userId },
          'userId-index'
        );
        data.listings = listings.slice(0, 10);
      }
      break;

    case 'cashback_info':
      data.balance = await getItem(BALANCES_TABLE, { userId });
      const recentTx = await query(
        TRANSACTIONS_TABLE,
        'userId = :userId',
        { ':userId': userId },
        'userId-index'
      );
      data.pendingCashback = recentTx
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);
      break;

    case 'help':
    case 'greeting':
    case 'unknown':
    default:
      // No data needed
      break;
  }

  return data;
}

/**
 * Format response based on intent and data (STORY-051, 052)
 */
function formatResponse(intent, data, language) {
  const responses = RESPONSE_TEMPLATES[language] || RESPONSE_TEMPLATES.it;

  switch (intent.intent) {
    case 'check_balance':
      const bal = data.balance || { available: 0, pending: 0 };
      return responses.balance
        .replace('{available}', bal.available?.toFixed(2) || '0.00')
        .replace('{pending}', bal.pending?.toFixed(2) || '0.00')
        .replace('{total}', ((bal.available || 0) + (bal.pending || 0)).toFixed(2));

    case 'transaction_history':
      if (!data.transactions?.length) {
        return responses.no_transactions;
      }
      const txList = data.transactions
        .slice(0, 5)
        .map(t => `• ${t.type}: ${t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)}€ (${t.status})`)
        .join('\n');
      return responses.transactions.replace('{list}', txList);

    case 'group_info':
      if (data.group) {
        return responses.group_detail
          .replace('{name}', data.group.name)
          .replace('{members}', data.group.memberCount || data.group.members?.length)
          .replace('{cashback}', data.group.stats?.totalCashback?.toFixed(2) || '0.00');
      }
      if (data.groups?.length) {
        const groupList = data.groups
          .map(g => `• ${g.name} (${g.members?.length} membri)`)
          .join('\n');
        return responses.groups_list.replace('{list}', groupList);
      }
      return responses.no_groups;

    case 'listing_status':
      if (data.listing) {
        return responses.listing_detail
          .replace('{title}', data.listing.title)
          .replace('{status}', data.listing.status)
          .replace('{views}', data.listing.views || 0);
      }
      if (data.listings?.length) {
        const listingList = data.listings
          .map(l => `• ${l.title} - ${l.status}`)
          .join('\n');
        return responses.listings_list.replace('{list}', listingList);
      }
      return responses.no_listings;

    case 'cashback_info':
      return responses.cashback_info
        .replace('{pending}', data.pendingCashback?.toFixed(2) || '0.00')
        .replace('{days}', '30');

    case 'help':
      return responses.help;

    case 'greeting':
      return responses.greeting;

    case 'privacy_violation':
      return responses.privacy_violation;

    default:
      return responses.unknown;
  }
}

/**
 * Send response via Messenger
 */
async function sendChatbotResponse(facebookId, text, intent) {
  // For some intents, add quick reply buttons
  const quickReplies = getQuickReplies(intent.intent);

  if (quickReplies.length > 0) {
    await sendButtons(facebookId, text, quickReplies);
  } else {
    await sendMessage(facebookId, text);
  }
}

/**
 * Get quick reply buttons based on intent
 */
function getQuickReplies(intent) {
  const buttons = {
    greeting: [
      { type: 'postback', title: '💰 Saldo', payload: 'CHECK_BALANCE' },
      { type: 'postback', title: '📦 Annunci', payload: 'MY_LISTINGS' },
      { type: 'postback', title: '❓ Aiuto', payload: 'HELP' },
    ],
    help: [
      { type: 'postback', title: '💰 Saldo', payload: 'CHECK_BALANCE' },
      { type: 'postback', title: '📊 Transazioni', payload: 'TRANSACTIONS' },
      { type: 'postback', title: '👥 Gruppi', payload: 'MY_GROUPS' },
    ],
    check_balance: [
      { type: 'postback', title: '📊 Storico', payload: 'TRANSACTIONS' },
      { type: 'postback', title: '💵 Cashback', payload: 'CASHBACK_INFO' },
    ],
  };

  return buttons[intent] || [];
}

const INTENT_ANALYSIS_PROMPT = `Sei un assistente per un marketplace. Analizza il messaggio dell'utente e determina l'intento.

Possibili intenti:
- check_balance: vuole sapere il suo saldo/credito
- transaction_history: vuole vedere le transazioni
- group_info: vuole info sui gruppi
- listing_status: vuole sapere stato dei suoi annunci
- cashback_info: domande sul cashback
- help: chiede aiuto
- greeting: saluto generico
- privacy_violation: chiede info su altri utenti (RIFIUTA)
- unknown: altro

Rispondi con JSON:
{
  "intent": "nome_intent",
  "params": { parametri opzionali },
  "confidence": 0.0-1.0
}`;

const RESPONSE_TEMPLATES = {
  it: {
    balance: '💰 Il tuo saldo:\n• Disponibile: {available}€\n• In attesa: {pending}€\n• Totale: {total}€',
    transactions: '📊 Ultime transazioni:\n{list}',
    no_transactions: 'Non hai ancora transazioni.',
    group_detail: '👥 Gruppo: {name}\n• Membri: {members}\n• Cashback totale: {cashback}€',
    groups_list: '👥 I tuoi gruppi:\n{list}',
    no_groups: 'Non fai parte di nessun gruppo.',
    listing_detail: '📦 Annuncio: {title}\n• Stato: {status}\n• Visualizzazioni: {views}',
    listings_list: '📦 I tuoi annunci:\n{list}',
    no_listings: 'Non hai annunci attivi.',
    cashback_info: '💵 Cashback in attesa: {pending}€\nSara disponibile tra {days} giorni dalla conferma.',
    help: '❓ Come posso aiutarti?\n• Scrivi "saldo" per vedere il tuo credito\n• Scrivi "transazioni" per lo storico\n• Scrivi "gruppi" per i tuoi gruppi\n• Scrivi "annunci" per i tuoi annunci',
    greeting: 'Ciao! 👋 Sono l\'assistente Quofind. Come posso aiutarti oggi?',
    privacy_violation: '🔒 Mi dispiace, non posso fornire informazioni su altri utenti per motivi di privacy.',
    unknown: 'Non ho capito la tua richiesta. Scrivi "aiuto" per vedere cosa posso fare.',
  },
  en: {
    balance: '💰 Your balance:\n• Available: {available}€\n• Pending: {pending}€\n• Total: {total}€',
    transactions: '📊 Recent transactions:\n{list}',
    no_transactions: 'You have no transactions yet.',
    group_detail: '👥 Group: {name}\n• Members: {members}\n• Total cashback: {cashback}€',
    groups_list: '👥 Your groups:\n{list}',
    no_groups: 'You are not part of any group.',
    listing_detail: '📦 Listing: {title}\n• Status: {status}\n• Views: {views}',
    listings_list: '📦 Your listings:\n{list}',
    no_listings: 'You have no active listings.',
    cashback_info: '💵 Pending cashback: {pending}€\nWill be available {days} days after confirmation.',
    help: '❓ How can I help?\n• Type "balance" to see your credit\n• Type "transactions" for history\n• Type "groups" for your groups\n• Type "listings" for your ads',
    greeting: 'Hello! 👋 I\'m the Quofind assistant. How can I help you today?',
    privacy_violation: '🔒 Sorry, I cannot provide information about other users for privacy reasons.',
    unknown: 'I didn\'t understand your request. Type "help" to see what I can do.',
  },
};

export default { handler, analyzeIntent, fetchData, formatResponse };
