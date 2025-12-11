// Mock OpenSearch before importing handler
const mockIndexDocument = jest.fn(() => Promise.resolve({ result: 'created' }));
const mockDeleteDocument = jest.fn(() => Promise.resolve({ result: 'deleted' }));
const mockCreateIndex = jest.fn(() => Promise.resolve(true));

jest.mock('../../src/lib/opensearch.js', () => ({
  indexDocument: mockIndexDocument,
  deleteDocument: mockDeleteDocument,
  createIndex: mockCreateIndex,
  listingsMappings: {},
  requestsMappings: {},
}));

import { handler } from '../../src/functions/sync/index.js';

describe('DynamoDB to OpenSearch Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('INSERT events', () => {
    it('should index new listing document', async () => {
      const event = {
        Records: [
          {
            eventName: 'INSERT',
            eventSourceARN: 'arn:aws:dynamodb:eu-south-1:123456789:table/MarketplaceListings-dev/stream/2024',
            dynamodb: {
              NewImage: {
                id: { S: 'listing-123' },
                userId: { S: 'user-456' },
                title: { S: 'iPhone 15 Pro' },
                description: { S: 'Nuovo, mai usato' },
                category: { S: 'elettronica' },
                price: { N: '1200' },
                status: { S: 'active' },
                createdAt: { S: '2024-01-15T10:00:00Z' },
              },
            },
          },
        ],
      };

      const result = await handler(event);

      expect(result.processed).toBe(1);
      expect(result.indexed).toBe(1);
      expect(result.errors).toBe(0);
      expect(mockIndexDocument).toHaveBeenCalledWith(
        'listings',
        'listing-123',
        expect.objectContaining({
          id: 'listing-123',
          title: 'iPhone 15 Pro',
          category: 'elettronica',
        })
      );
    });

    it('should index new request document', async () => {
      const event = {
        Records: [
          {
            eventName: 'INSERT',
            eventSourceARN: 'arn:aws:dynamodb:eu-south-1:123456789:table/MarketplaceRequests-dev/stream/2024',
            dynamodb: {
              NewImage: {
                id: { S: 'request-789' },
                userId: { S: 'user-111' },
                description: { S: 'Cerco bici da corsa' },
                category: { S: 'sport' },
                prezzoMax: { N: '500' },
                status: { S: 'active' },
              },
            },
          },
        ],
      };

      const result = await handler(event);

      expect(result.indexed).toBe(1);
      expect(mockIndexDocument).toHaveBeenCalledWith(
        'requests',
        'request-789',
        expect.objectContaining({
          id: 'request-789',
          category: 'sport',
        })
      );
    });
  });

  describe('MODIFY events', () => {
    it('should update existing document', async () => {
      const event = {
        Records: [
          {
            eventName: 'MODIFY',
            eventSourceARN: 'arn:aws:dynamodb:eu-south-1:123456789:table/MarketplaceListings-dev/stream/2024',
            dynamodb: {
              NewImage: {
                id: { S: 'listing-123' },
                userId: { S: 'user-456' },
                title: { S: 'iPhone 15 Pro - RIBASSATO' },
                price: { N: '1000' },
                status: { S: 'active' },
              },
            },
          },
        ],
      };

      const result = await handler(event);

      expect(result.indexed).toBe(1);
      expect(mockIndexDocument).toHaveBeenCalled();
    });
  });

  describe('REMOVE events', () => {
    it('should delete document from index', async () => {
      const event = {
        Records: [
          {
            eventName: 'REMOVE',
            eventSourceARN: 'arn:aws:dynamodb:eu-south-1:123456789:table/MarketplaceListings-dev/stream/2024',
            dynamodb: {
              OldImage: {
                id: { S: 'listing-123' },
                userId: { S: 'user-456' },
              },
            },
          },
        ],
      };

      const result = await handler(event);

      expect(result.deleted).toBe(1);
      expect(mockDeleteDocument).toHaveBeenCalledWith('listings', 'listing-123');
    });
  });

  describe('Multiple records', () => {
    it('should process multiple records', async () => {
      const event = {
        Records: [
          {
            eventName: 'INSERT',
            eventSourceARN: 'arn:aws:dynamodb:eu-south-1:123456789:table/MarketplaceListings-dev/stream/2024',
            dynamodb: {
              NewImage: {
                id: { S: 'listing-1' },
                title: { S: 'Item 1' },
                status: { S: 'active' },
              },
            },
          },
          {
            eventName: 'INSERT',
            eventSourceARN: 'arn:aws:dynamodb:eu-south-1:123456789:table/MarketplaceListings-dev/stream/2024',
            dynamodb: {
              NewImage: {
                id: { S: 'listing-2' },
                title: { S: 'Item 2' },
                status: { S: 'active' },
              },
            },
          },
          {
            eventName: 'REMOVE',
            eventSourceARN: 'arn:aws:dynamodb:eu-south-1:123456789:table/MarketplaceListings-dev/stream/2024',
            dynamodb: {
              OldImage: {
                id: { S: 'listing-3' },
              },
            },
          },
        ],
      };

      const result = await handler(event);

      expect(result.processed).toBe(3);
      expect(result.indexed).toBe(2);
      expect(result.deleted).toBe(1);
    });
  });

  describe('Unknown table', () => {
    it('should skip records from unknown tables', async () => {
      const event = {
        Records: [
          {
            eventName: 'INSERT',
            eventSourceARN: 'arn:aws:dynamodb:eu-south-1:123456789:table/UnknownTable/stream/2024',
            dynamodb: {
              NewImage: {
                id: { S: 'item-1' },
              },
            },
          },
        ],
      };

      const result = await handler(event);

      expect(result.processed).toBe(1);
      expect(result.indexed).toBe(0);
      expect(mockIndexDocument).not.toHaveBeenCalled();
    });
  });
});
