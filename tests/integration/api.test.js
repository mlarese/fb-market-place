/**
 * Integration tests for Quofind Marketplace API
 * These tests require a deployed stack or local SAM setup
 */

const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:3000';

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it.skip('should respond to webhook verification', async () => {
      const verifyToken = 'test_verify_token';
      const challenge = 'test_challenge_123';

      const response = await fetch(
        `${API_ENDPOINT}/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`
      );

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe(challenge);
    });
  });

  describe('AI Analysis Endpoint', () => {
    it.skip('should analyze listing text', async () => {
      const response = await fetch(`${API_ENDPOINT}/internal/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Vendo iPhone 15 Pro 256GB, come nuovo, 1200 euro, Milano',
          type: 'listing',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.tipo).toBe('vendo');
      expect(data.categoria).toBe('elettronica');
      expect(data.prezzo).toBe(1200);
      expect(data.localita).toBe('Milano');
    });

    it.skip('should analyze request text', async () => {
      const response = await fetch(`${API_ENDPOINT}/internal/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Cerco una bici da corsa usata, budget massimo 500 euro, zona Roma',
          type: 'request',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.tipo).toBe('cerco');
      expect(data.prezzoMax).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it.skip('should return 400 for missing text', async () => {
      const response = await fetch(`${API_ENDPOINT}/internal/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });
});
