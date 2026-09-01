import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, Errors } from './errors';

export interface AccessTokenPayload {
  /** user id */
  sub: string;
  /** email */
  email: string;
}

export function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ email }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string' || !decoded.sub || !decoded.email) {
      throw new Error('Malformed token');
    }
    return { sub: decoded.sub, email: decoded.email as string };
  } catch (err) {
    if (err instanceof AppError) throw err;
    const expired = err instanceof jwt.TokenExpiredError;
    throw new AppError(401, expired ? Errors.TOKEN_EXPIRED : Errors.INVALID_TOKEN, 'Invalid or expired token');
  }
}