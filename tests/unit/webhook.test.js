import crypto from 'crypto';

// Mock secrets before importing handler
const mockSecrets = {
  FACEBOOK_VERIFY_TOKEN: 'test_verify_token',
  FACEBOOK_APP_SECRET: 'test_app_secret',
};

jest.mock('../../src/lib/secrets.js', () => ({
  getSecrets: jest.fn(() => Promise.resolve(mockSecrets)),
  getSecret: jest.fn((key) => Promise.resolve(mockSecrets[key])),
}));

import { handler } from '../../src/functions/webhooks/index.js';

describe('Facebook Webhook Handler', () => {
  describe('GET - Verification', () => {
    it('should verify valid webhook subscription', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test_verify_token',
          'hub.challenge': 'challenge_12345',
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('challenge_12345');
    });

    it('should reject invalid verify token', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'challenge_12345',
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
    });

    it('should reject invalid hub.mode', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          'hub.mode': 'unsubscribe',
          'hub.verify_token': 'test_verify_token',
          'hub.challenge': 'challenge_12345',
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST - Event Processing', () => {
    it('should accept valid signed event', async () => {
      const body = JSON.stringify({
        object: 'page',
        entry: [
          {
            id: 'page_123',
            time: Date.now(),
            messaging: [],
          },
        ],
      });

      const signature = 'sha256=' + crypto
        .createHmac('sha256', 'test_app_secret')
        .update(body)
        .digest('hex');

      const event = {
        httpMethod: 'POST',
        headers: {
          'x-hub-signature-256': signature,
        },
        body,
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).status).toBe('EVENT_RECEIVED');
    });

    it('should reject invalid signature', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=invalid',
        },
        body: JSON.stringify({ object: 'page', entry: [] }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
    });

    it('should reject missing signature', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({ object: 'page', entry: [] }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Unsupported methods', () => {
    it('should reject unsupported HTTP methods', async () => {
      const event = {
        httpMethod: 'DELETE',
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });
  });
});
