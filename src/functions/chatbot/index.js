import OpenAI from 'openai';
import { getSecret } from '../../lib/secrets.js';
import { success, badRequest, error } from '../../lib/response.js';

let openaiClient = null;

/**
 * AI Content Analysis Handler
 * Analyzes text content to extract structured data for listings/requests
 */
export async function handler(event) {
  console.log('AI Analysis request:', JSON.stringify(event));

  try {
    const body = JSON.parse(event.body || '{}');
    const { text, type = 'listing' } = body;

    if (!text) {
      return badRequest('Missing required field: text');
    }

    const analysis = await analyzeContent(text, type);
    return success(analysis);
  } catch (err) {
    console.error('AI Analysis error:', err);
    return error('Analysis failed', 500, err.message);
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
 * Analyze content using OpenAI
 */
async function analyzeContent(text, type) {
  const client = await getOpenAIClient();

  const systemPrompt = type === 'listing'
    ? LISTING_ANALYSIS_PROMPT
    : REQUEST_ANALYSIS_PROMPT;

  const response = await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  const parsed = JSON.parse(content);
  return {
    ...parsed,
    confidence: calculateConfidence(parsed),
    originalText: text,
    type,
  };
}

/**
 * Calculate confidence score based on extracted fields
 */
function calculateConfidence(analysis) {
  let score = 0;
  let fields = 0;

  if (analysis.tipo) { score += 20; fields++; }
  if (analysis.categoria) { score += 20; fields++; }
  if (analysis.prezzo) { score += 15; fields++; }
  if (analysis.localita) { score += 15; fields++; }
  if (analysis.paroleChiave?.length > 0) { score += 15; fields++; }
  if (analysis.titolo) { score += 15; fields++; }

  return {
    score,
    fieldsExtracted: fields,
    isComplete: score >= 70,
  };
}

const LISTING_ANALYSIS_PROMPT = `Sei un assistente che analizza annunci di vendita per un marketplace.
Estrai le seguenti informazioni dal testo e restituisci un JSON:

{
  "tipo": "vendo" o "cerco",
  "categoria": categoria del prodotto (es: "elettronica", "abbigliamento", "auto", "casa", "sport", "altro"),
  "titolo": titolo breve dell'annuncio (max 60 caratteri),
  "descrizione": descrizione pulita del prodotto,
  "prezzo": prezzo numerico (solo il numero, senza simboli),
  "valuta": "EUR" (default),
  "localita": citta o zona geografica menzionata,
  "paroleChiave": array di 3-5 parole chiave rilevanti,
  "condizione": "nuovo", "usato", "ricondizionato" o null,
  "spedizione": true se menziona spedizione, false altrimenti
}

Se un campo non e determinabile, usa null.
Rispondi SOLO con il JSON, nessun altro testo.`;

const REQUEST_ANALYSIS_PROMPT = `Sei un assistente che analizza richieste di acquisto per un marketplace.
Estrai le seguenti informazioni dal testo e restituisci un JSON:

{
  "tipo": "cerco",
  "categoria": categoria del prodotto cercato,
  "descrizione": descrizione di cosa sta cercando l'utente,
  "prezzoMin": budget minimo (numero o null),
  "prezzoMax": budget massimo (numero o null),
  "localita": zona geografica preferita o null,
  "paroleChiave": array di 3-5 parole chiave rilevanti,
  "urgenza": "alta", "media", "bassa" basato sul tono del messaggio
}

Se un campo non e determinabile, usa null.
Rispondi SOLO con il JSON, nessun altro testo.`;

export default { handler, analyzeContent };
