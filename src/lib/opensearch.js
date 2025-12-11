import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

let client = null;

/**
 * Get OpenSearch client (singleton with AWS Sig v4 auth)
 */
export function getClient() {
  if (client) return client;

  const endpoint = process.env.OPENSEARCH_ENDPOINT;
  if (!endpoint) {
    throw new Error('OPENSEARCH_ENDPOINT environment variable not set');
  }

  const region = process.env.AWS_REGION || 'eu-south-1';

  client = new Client({
    ...AwsSigv4Signer({
      region,
      service: 'es',
    }),
    node: `https://${endpoint}`,
  });

  return client;
}

/**
 * Index a document
 */
export async function indexDocument(indexName, id, document) {
  const osClient = getClient();
  return await osClient.index({
    index: indexName,
    id,
    body: document,
    refresh: true,
  });
}

/**
 * Delete a document
 */
export async function deleteDocument(indexName, id) {
  const osClient = getClient();
  try {
    return await osClient.delete({
      index: indexName,
      id,
      refresh: true,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return null; // Already deleted
    }
    throw error;
  }
}

/**
 * Search documents
 */
export async function search(indexName, query, options = {}) {
  const osClient = getClient();
  const { from = 0, size = 20, sort = null } = options;

  const body = { query };
  if (sort) body.sort = sort;

  const response = await osClient.search({
    index: indexName,
    body,
    from,
    size,
  });

  return {
    hits: response.body.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    })),
    total: response.body.hits.total.value,
  };
}

/**
 * Create index with mappings
 */
export async function createIndex(indexName, mappings, settings = {}) {
  const osClient = getClient();
  const exists = await osClient.indices.exists({ index: indexName });

  if (!exists.body) {
    await osClient.indices.create({
      index: indexName,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              italian_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'italian_stemmer', 'italian_stop'],
              },
            },
            filter: {
              italian_stemmer: {
                type: 'stemmer',
                language: 'italian',
              },
              italian_stop: {
                type: 'stop',
                stopwords: '_italian_',
              },
            },
          },
          ...settings,
        },
        mappings,
      },
    });
    return true;
  }
  return false;
}

// Listings index mappings
export const listingsMappings = {
  properties: {
    id: { type: 'keyword' },
    userId: { type: 'keyword' },
    groupId: { type: 'keyword' },
    title: { type: 'text', analyzer: 'italian_analyzer' },
    description: { type: 'text', analyzer: 'italian_analyzer' },
    category: { type: 'keyword' },
    price: { type: 'float' },
    currency: { type: 'keyword' },
    location: { type: 'geo_point' },
    locationText: { type: 'text', analyzer: 'italian_analyzer' },
    keywords: { type: 'keyword' },
    status: { type: 'keyword' },
    createdAt: { type: 'date' },
    expiresAt: { type: 'date' },
  },
};

// Requests index mappings
export const requestsMappings = {
  properties: {
    id: { type: 'keyword' },
    userId: { type: 'keyword' },
    description: { type: 'text', analyzer: 'italian_analyzer' },
    category: { type: 'keyword' },
    minPrice: { type: 'float' },
    maxPrice: { type: 'float' },
    location: { type: 'geo_point' },
    locationText: { type: 'text', analyzer: 'italian_analyzer' },
    keywords: { type: 'keyword' },
    status: { type: 'keyword' },
    createdAt: { type: 'date' },
    expiresAt: { type: 'date' },
  },
};

export default { getClient, indexDocument, deleteDocument, search, createIndex, listingsMappings, requestsMappings };
