import { success, created, noContent, error, badRequest, notFound, unauthorized, forbidden } from '../../src/lib/response.js';

describe('Response helpers', () => {
  describe('success', () => {
    it('should return 200 status with JSON body', () => {
      const data = { message: 'Hello' };
      const response = success(data);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(response.body)).toEqual(data);
    });

    it('should allow custom status code', () => {
      const response = success({ ok: true }, 201);
      expect(response.statusCode).toBe(201);
    });

    it('should include CORS headers', () => {
      const response = success({});
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Methods']).toContain('GET');
    });
  });

  describe('created', () => {
    it('should return 201 status', () => {
      const response = created({ id: '123' });
      expect(response.statusCode).toBe(201);
    });
  });

  describe('noContent', () => {
    it('should return 204 status with empty body', () => {
      const response = noContent();
      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
    });
  });

  describe('error', () => {
    it('should return error with message', () => {
      const response = error('Something went wrong', 500);
      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({ error: 'Something went wrong' });
    });

    it('should include details if provided', () => {
      const response = error('Failed', 500, { code: 'ERR_001' });
      const body = JSON.parse(response.body);
      expect(body.details).toEqual({ code: 'ERR_001' });
    });
  });

  describe('badRequest', () => {
    it('should return 400 status', () => {
      const response = badRequest('Invalid input');
      expect(response.statusCode).toBe(400);
    });
  });

  describe('notFound', () => {
    it('should return 404 status', () => {
      const response = notFound();
      expect(response.statusCode).toBe(404);
    });

    it('should use default message', () => {
      const response = notFound();
      expect(JSON.parse(response.body).error).toBe('Resource not found');
    });
  });

  describe('unauthorized', () => {
    it('should return 401 status', () => {
      const response = unauthorized();
      expect(response.statusCode).toBe(401);
    });
  });

  describe('forbidden', () => {
    it('should return 403 status', () => {
      const response = forbidden();
      expect(response.statusCode).toBe(403);
    });
  });
});
