// Mock dependencies before importing
const mockPutItem = jest.fn(() => Promise.resolve({}));
const mockGetItem = jest.fn();
const mockDeleteItem = jest.fn(() => Promise.resolve({}));
const mockQuery = jest.fn(() => Promise.resolve([]));
const mockSearch = jest.fn(() => Promise.resolve({ hits: [], total: 0 }));

jest.mock('../../src/lib/dynamodb.js', () => ({
  getItem: mockGetItem,
  putItem: mockPutItem,
  deleteItem: mockDeleteItem,
  query: mockQuery,
}));

jest.mock('../../src/lib/opensearch.js', () => ({
  search: mockSearch,
  indexDocument: jest.fn(),
  deleteDocument: jest.fn(),
}));

import { handler } from '../../src/functions/listings/index.js';

describe('Listings Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LISTINGS_TABLE = 'MarketplaceListings-test';
  });

  describe('POST /listings - Create Listing', () => {
    it('should create a new listing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          title: 'iPhone 15 Pro',
          description: 'Nuovo, mai usato',
          category: 'elettronica',
          price: 1200,
          localita: 'Milano',
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      expect(mockPutItem).toHaveBeenCalled();

      const listing = JSON.parse(response.body);
      expect(listing.id).toBeDefined();
      expect(listing.title).toBe('iPhone 15 Pro');
      expect(listing.status).toBe('active');
    });

    it('should return 400 if userId is missing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          title: 'iPhone 15 Pro',
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('userId');
    });
  });

  describe('GET /listings - Search Listings', () => {
    it('should search listings with filters', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [
          { id: 'listing-1', title: 'iPhone', price: 1000 },
          { id: 'listing-2', title: 'iPhone Pro', price: 1200 },
        ],
        total: 2,
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          q: 'iphone',
          category: 'elettronica',
          minPrice: '500',
          maxPrice: '1500',
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(mockSearch).toHaveBeenCalled();

      const result = JSON.parse(response.body);
      expect(result.listings).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should paginate results', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ id: 'listing-21' }],
        total: 50,
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          page: '2',
          limit: '20',
        },
      };

      const response = await handler(event);
      const result = JSON.parse(response.body);

      expect(result.page).toBe(2);
      expect(result.pages).toBe(3); // 50 / 20 = 2.5 -> 3
    });
  });

  describe('GET /listings/{id} - Get Listing', () => {
    it('should return a listing by ID', async () => {
      mockGetItem.mockResolvedValueOnce({
        id: 'listing-123',
        title: 'iPhone 15',
        price: 1200,
      });

      const event = {
        httpMethod: 'GET',
        pathParameters: { id: 'listing-123' },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(mockGetItem).toHaveBeenCalledWith('MarketplaceListings-test', { id: 'listing-123' });
    });

    it('should return 404 if listing not found', async () => {
      mockGetItem.mockResolvedValueOnce(null);

      const event = {
        httpMethod: 'GET',
        pathParameters: { id: 'nonexistent' },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /listings/{id} - Delete Listing', () => {
    it('should delete a listing', async () => {
      mockGetItem.mockResolvedValueOnce({
        id: 'listing-123',
        userId: 'user-456',
      });

      const event = {
        httpMethod: 'DELETE',
        pathParameters: { id: 'listing-123' },
        requestContext: {
          authorizer: { userId: 'user-456' },
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(204);
      expect(mockDeleteItem).toHaveBeenCalled();
    });

    it('should return 403 if not owner', async () => {
      mockGetItem.mockResolvedValueOnce({
        id: 'listing-123',
        userId: 'user-456',
      });

      const event = {
        httpMethod: 'DELETE',
        pathParameters: { id: 'listing-123' },
        requestContext: {
          authorizer: { userId: 'different-user' },
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(403);
    });
  });
});
