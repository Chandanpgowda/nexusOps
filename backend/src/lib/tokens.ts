import crypto from 'node:crypto';

/** Generate a cryptographically secure random opaque token. */
export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Hash a token for storage. Raw tokens are never persisted. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}