import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});
let cachedSecrets = null;
let cacheExpiry = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Retrieves secrets from AWS Secrets Manager with caching
 * @returns {Promise<Object>} Parsed secrets object
 */
export async function getSecrets() {
  const now = Date.now();

  if (cachedSecrets && cacheExpiry && now < cacheExpiry) {
    return cachedSecrets;
  }

  const secretArn = process.env.SECRETS_ARN;
  if (!secretArn) {
    throw new Error('SECRETS_ARN environment variable not set');
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await client.send(command);

    cachedSecrets = JSON.parse(response.SecretString);
    cacheExpiry = now + CACHE_TTL;

    return cachedSecrets;
  } catch (error) {
    console.error('Failed to retrieve secrets:', error);
    throw error;
  }
}

/**
 * Get a specific secret value
 * @param {string} key - Secret key name
 * @returns {Promise<string>} Secret value
 */
export async function getSecret(key) {
  const secrets = await getSecrets();
  if (!secrets[key]) {
    throw new Error(`Secret key not found: ${key}`);
  }
  return secrets[key];
}

/**
 * Invalidate the secrets cache
 */
export function invalidateCache() {
  cachedSecrets = null;
  cacheExpiry = null;
}

export default { getSecrets, getSecret, invalidateCache };
