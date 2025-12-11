import { unmarshall } from '@aws-sdk/util-dynamodb';
import { indexDocument, deleteDocument, createIndex, listingsMappings, requestsMappings } from '../../lib/opensearch.js';

const LISTINGS_INDEX = 'listings';
const REQUESTS_INDEX = 'requests';

/**
 * DynamoDB Streams to OpenSearch Sync Handler
 * Processes DynamoDB stream events and syncs to OpenSearch
 */
export async function handler(event) {
  console.log(`Processing ${event.Records.length} records`);

  // Ensure indices exist
  await ensureIndices();

  const results = {
    processed: 0,
    indexed: 0,
    deleted: 0,
    errors: 0,
  };

  for (const record of event.Records) {
    try {
      await processRecord(record, results);
      results.processed++;
    } catch (err) {
      console.error('Error processing record:', err, record);
      results.errors++;
    }
  }

  console.log('Sync results:', results);
  return results;
}

/**
 * Ensure OpenSearch indices exist
 */
async function ensureIndices() {
  try {
    await createIndex(LISTINGS_INDEX, listingsMappings);
    await createIndex(REQUESTS_INDEX, requestsMappings);
  } catch (err) {
    // Indices may already exist, log and continue
    console.log('Index creation:', err.message);
  }
}

/**
 * Process a single DynamoDB stream record
 */
async function processRecord(record, results) {
  const eventName = record.eventName; // INSERT, MODIFY, REMOVE
  const eventSourceARN = record.eventSourceARN;

  // Determine which table this event is from
  const isListings = eventSourceARN.includes('MarketplaceListings');
  const isRequests = eventSourceARN.includes('MarketplaceRequests');

  if (!isListings && !isRequests) {
    console.log('Unknown table, skipping:', eventSourceARN);
    return;
  }

  const indexName = isListings ? LISTINGS_INDEX : REQUESTS_INDEX;

  if (eventName === 'REMOVE') {
    const oldImage = record.dynamodb.OldImage;
    const item = unmarshall(oldImage);
    const id = item.id;

    await deleteDocument(indexName, id);
    results.deleted++;
    console.log(`Deleted ${id} from ${indexName}`);
  } else {
    // INSERT or MODIFY
    const newImage = record.dynamodb.NewImage;
    const item = unmarshall(newImage);

    const document = isListings
      ? transformListing(item)
      : transformRequest(item);

    await indexDocument(indexName, item.id, document);
    results.indexed++;
    console.log(`Indexed ${item.id} to ${indexName}`);
  }
}

/**
 * Transform DynamoDB listing item to OpenSearch document
 */
function transformListing(item) {
  const doc = {
    id: item.id,
    userId: item.userId,
    groupId: item.groupId || null,
    title: item.title || '',
    description: item.description || '',
    category: item.category || 'altro',
    price: parseFloat(item.price) || 0,
    currency: item.currency || 'EUR',
    locationText: item.localita || item.locationText || '',
    keywords: item.paroleChiave || item.keywords || [],
    status: item.status || 'active',
    createdAt: item.createdAt || new Date().toISOString(),
    expiresAt: item.expiresAt || null,
  };

  // Add geo_point if coordinates available
  if (item.latitude && item.longitude) {
    doc.location = {
      lat: parseFloat(item.latitude),
      lon: parseFloat(item.longitude),
    };
  }

  return doc;
}

/**
 * Transform DynamoDB request item to OpenSearch document
 */
function transformRequest(item) {
  const doc = {
    id: item.id,
    userId: item.userId,
    description: item.description || '',
    category: item.category || 'altro',
    minPrice: item.prezzoMin ? parseFloat(item.prezzoMin) : null,
    maxPrice: item.prezzoMax ? parseFloat(item.prezzoMax) : null,
    locationText: item.localita || item.locationText || '',
    keywords: item.paroleChiave || item.keywords || [],
    status: item.status || 'active',
    createdAt: item.createdAt || new Date().toISOString(),
    expiresAt: item.expiresAt || null,
  };

  // Add geo_point if coordinates available
  if (item.latitude && item.longitude) {
    doc.location = {
      lat: parseFloat(item.latitude),
      lon: parseFloat(item.longitude),
    };
  }

  return doc;
}

export default { handler };
