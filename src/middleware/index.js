import axios from 'axios';
import { getSecret } from '../lib/secrets.js';

// Token validation cache
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Token Validator Lambda Authorizer
 * Validates Facebook access tokens and returns IAM policy
 */
export async function handler(event) {
  console.log('Token validation request:', JSON.stringify(event));

  try {
    const token = extractToken(event);
    if (!token) {
      return generatePolicy('anonymous', 'Deny', event.methodArn);
    }

    const validationResult = await validateFacebookToken(token);
    if (!validationResult.isValid) {
      console.log('Token validation failed:', validationResult.error);
      return generatePolicy('anonymous', 'Deny', event.methodArn);
    }

    const userId = validationResult.userId;
    console.log('Token validated for user:', userId);

    return generatePolicy(userId, 'Allow', event.methodArn, {
      userId,
      facebookId: validationResult.facebookId,
    });
  } catch (err) {
    console.error('Token validation error:', err);
    return generatePolicy('anonymous', 'Deny', event.methodArn);
  }
}

/**
 * Extract token from Authorization header or query string
 */
function extractToken(event) {
  // Check Authorization header
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }

  // Check query string
  if (event.queryStringParameters?.access_token) {
    return event.queryStringParameters.access_token;
  }

  return null;
}

/**
 * Validate Facebook access token
 */
async function validateFacebookToken(token) {
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    const appId = await getSecret('FACEBOOK_APP_ID');
    const appSecret = await getSecret('FACEBOOK_APP_SECRET');

    // Debug token with Facebook Graph API
    const debugUrl = `https://graph.facebook.com/debug_token`;
    const response = await axios.get(debugUrl, {
      params: {
        input_token: token,
        access_token: `${appId}|${appSecret}`,
      },
    });

    const data = response.data.data;

    if (!data.is_valid) {
      return { isValid: false, error: 'Token is invalid' };
    }

    if (data.app_id !== appId) {
      return { isValid: false, error: 'Token not issued for this app' };
    }

    // Check expiration
    if (data.expires_at && data.expires_at * 1000 < Date.now()) {
      return { isValid: false, error: 'Token expired' };
    }

    const result = {
      isValid: true,
      facebookId: data.user_id,
      userId: data.user_id, // Use Facebook ID as user ID
      scopes: data.scopes || [],
      expiresAt: data.expires_at ? data.expires_at * 1000 : null,
    };

    // Cache the result
    tokenCache.set(token, {
      result,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return result;
  } catch (err) {
    console.error('Facebook token validation error:', err.response?.data || err.message);
    return { isValid: false, error: err.message };
  }
}

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(principalId, effect, resource, context = {}) {
  const policy = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };

  if (Object.keys(context).length > 0) {
    policy.context = context;
  }

  return policy;
}

/**
 * Middleware for Lambda functions (non-authorizer use)
 * Validates token and extracts user info
 */
export async function validateRequest(event) {
  const token = extractToken(event);
  if (!token) {
    return { isValid: false, error: 'No token provided' };
  }

  return await validateFacebookToken(token);
}

export default { handler, validateRequest };
