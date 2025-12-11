/**
 * Standard API response helpers
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * Success response
 */
export function success(data, statusCode = 200) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(data),
  };
}

/**
 * Created response
 */
export function created(data) {
  return success(data, 201);
}

/**
 * No content response
 */
export function noContent() {
  return {
    statusCode: 204,
    headers: corsHeaders,
    body: '',
  };
}

/**
 * Error response
 */
export function error(message, statusCode = 500, details = null) {
  const body = { error: message };
  if (details) body.details = details;

  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

/**
 * Bad request response
 */
export function badRequest(message, details = null) {
  return error(message, 400, details);
}

/**
 * Not found response
 */
export function notFound(message = 'Resource not found') {
  return error(message, 404);
}

/**
 * Unauthorized response
 */
export function unauthorized(message = 'Unauthorized') {
  return error(message, 401);
}

/**
 * Forbidden response
 */
export function forbidden(message = 'Forbidden') {
  return error(message, 403);
}

export default { success, created, noContent, error, badRequest, notFound, unauthorized, forbidden };
