import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock AWS SDK
const mockPutItem = jest.fn();
const mockGetItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockQuery = jest.fn();

jest.unstable_mockModule('../../src/lib/dynamodb.js', () => ({
  putItem: mockPutItem,
  getItem: mockGetItem,
  updateItem: mockUpdateItem,
  query: mockQuery,
  scan: jest.fn(),
  deleteItem: jest.fn(),
}));

const { handler } = await import('../../src/functions/cashback/index.js');

describe('Cashback Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BALANCES_TABLE = 'TestBalancesTable';
    process.env.TRANSACTIONS_TABLE = 'TestTransactionsTable';
    process.env.CASHBACK_CONFIG_TABLE = 'TestConfigTable';
    process.env.GROUPS_TABLE = 'TestGroupsTable';
  });

  describe('GET /cashback/config', () => {
    it('should return default config if none exists', async () => {
      mockGetItem.mockResolvedValue(null);
      mockPutItem.mockResolvedValue({});

      const event = {
        httpMethod: 'GET',
        path: '/cashback/config',
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.quofindCommission).toBe(0.10);
      expect(body.buyerCashback).toBe(0.66);
      expect(body.groupLeaderCashback).toBe(0.05);
      expect(body.referrerCashback).toBe(0.02);
    });

    it('should return stored config', async () => {
      mockGetItem.mockResolvedValue({
        id: 'default',
        quofindCommission: 0.15,
        buyerCashback: 0.60,
        groupLeaderCashback: 0.08,
        referrerCashback: 0.03,
        pendingPeriodDays: 30,
      });

      const event = {
        httpMethod: 'GET',
        path: '/cashback/config',
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.quofindCommission).toBe(0.15);
      expect(body.buyerCashback).toBe(0.60);
    });
  });

  describe('GET /cashback/balance', () => {
    it('should return user balance', async () => {
      mockGetItem.mockResolvedValue({
        userId: 'user-123',
        available: 50.00,
        pending: 25.00,
        lastUpdated: '2024-01-01T00:00:00.000Z',
      });

      const event = {
        httpMethod: 'GET',
        path: '/cashback/balance',
        requestContext: { authorizer: { userId: 'user-123' } },
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.available).toBe(50.00);
      expect(body.pending).toBe(25.00);
      expect(body.total).toBe(75.00);
    });

    it('should create balance if not exists', async () => {
      mockGetItem.mockResolvedValue(null);
      mockPutItem.mockResolvedValue({});

      const event = {
        httpMethod: 'GET',
        path: '/cashback/balance',
        requestContext: { authorizer: { userId: 'new-user' } },
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.available).toBe(0);
      expect(body.pending).toBe(0);
      expect(mockPutItem).toHaveBeenCalled();
    });
  });

  describe('POST /cashback/calculate', () => {
    it('should calculate commission breakdown', async () => {
      mockGetItem.mockResolvedValue({
        id: 'default',
        quofindCommission: 0.10,
        buyerCashback: 0.66,
        groupLeaderCashback: 0.05,
        referrerCashback: 0.02,
      });

      const event = {
        httpMethod: 'POST',
        path: '/cashback/calculate',
        body: JSON.stringify({
          salePrice: 100,
          groupId: 'group-123',
          referrerId: 'referrer-456',
        }),
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.salePrice).toBe(100);
      expect(body.commission).toBe(10); // 10% of 100
      expect(body.buyerCashback).toBe(6.60); // 66% of 10
      expect(body.groupLeaderCashback).toBe(0.50); // 5% of 10
      expect(body.referrerCashback).toBe(0.20); // 2% of 10
    });

    it('should return 400 for invalid price', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/cashback/calculate',
        body: JSON.stringify({ salePrice: -50 }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should handle sale without group or referrer', async () => {
      mockGetItem.mockResolvedValue({
        id: 'default',
        quofindCommission: 0.10,
        buyerCashback: 0.66,
        groupLeaderCashback: 0.05,
        referrerCashback: 0.02,
      });

      const event = {
        httpMethod: 'POST',
        path: '/cashback/calculate',
        body: JSON.stringify({ salePrice: 100 }),
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.groupLeaderCashback).toBe(0);
      expect(body.referrerCashback).toBe(0);
    });
  });

  describe('GET /cashback/transactions', () => {
    it('should return transaction history', async () => {
      mockQuery.mockResolvedValue([
        { transactionId: 'tx-1', amount: 10, type: 'credit', timestamp: '2024-01-02' },
        { transactionId: 'tx-2', amount: 5, type: 'credit', timestamp: '2024-01-01' },
      ]);

      const event = {
        httpMethod: 'GET',
        path: '/cashback/transactions',
        requestContext: { authorizer: { userId: 'user-123' } },
        queryStringParameters: { limit: '10' },
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.transactions.length).toBe(2);
      expect(body.total).toBe(2);
    });
  });
});
