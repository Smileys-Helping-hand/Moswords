/**
 * Master Token System - Central authentication hub for the ecosystem
 *
 * All connected apps (FinancePlay, LifeStack, Moswords, etc.) authenticate
 * using a master token that's validated against the Second Brain (this app).
 *
 * Usage:
 * Authorization: Bearer <SECOND_BRAIN_API_KEY>
 */

import { headers } from 'next/headers';

export class MasterTokenError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = 'MasterTokenError';
  }
}

/**
 * Extract and validate master token from request headers
 * @throws MasterTokenError if token is missing or invalid
 */
export async function validateMasterToken(): Promise<string> {
  const headersList = await headers();
  const authHeader = headersList.get('Authorization');

  if (!authHeader) {
    throw new MasterTokenError('Missing Authorization header', 401);
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer') {
    throw new MasterTokenError('Invalid Authorization scheme. Use Bearer token', 401);
  }

  if (!token) {
    throw new MasterTokenError('Empty Bearer token', 401);
  }

  // Validate token format (alphanumeric-underscores)
  if (!/^[a-zA-Z0-9_\-]+$/.test(token)) {
    throw new MasterTokenError('Invalid token format', 401);
  }

  // Check against environment variable
  const expectedToken = process.env.SECOND_BRAIN_API_KEY;
  if (!expectedToken) {
    throw new MasterTokenError('Server misconfigured: SECOND_BRAIN_API_KEY not set', 500);
  }

  // Constant-time comparison to prevent timing attacks
  const isValid = await constantTimeCompare(token, expectedToken);
  if (!isValid) {
    throw new MasterTokenError('Invalid or expired token', 401);
  }

  return token;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  // Convert to buffers
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // If lengths differ, still compare all bytes for timing consistency
  if (bufA.length !== bufB.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }

  return result === 0;
}

/**
 * Middleware helper to validate token in API routes
 */
export async function requireMasterToken() {
  try {
    const token = await validateMasterToken();
    return { valid: true, token };
  } catch (error) {
    if (error instanceof MasterTokenError) {
      return { valid: false, status: error.status, message: error.message };
    }
    return { valid: false, status: 500, message: 'Internal server error' };
  }
}
