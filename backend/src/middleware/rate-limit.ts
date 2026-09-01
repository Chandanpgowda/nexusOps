import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';

/** General API limiter (per process). */
export const apiLimiter = rateLimit({
  windowMs: (env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  limit: env.RATE_LIMIT_MAX || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
});

/** Stricter limiter for authentication endpoints (brute-force protection). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later', code: 'RATE_LIMITED' },
});