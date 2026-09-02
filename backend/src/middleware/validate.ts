import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError, Errors } from '../lib/errors';

/**
 * Validates `req.body` against a Zod schema. On success the parsed (coerced)
 * value replaces req.body; on failure a 400 with flattened issues is returned.
 */
export function validate<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new AppError(400, Errors.VALIDATION, 'Invalid request body', result.error.flatten())
      );
    }
    req.body = result.data;
    next();
  };
}

/** Validates `req.query` against a Zod schema. On success replaces req.query. */
export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new AppError(400, Errors.VALIDATION, 'Invalid query parameters', result.error.flatten())
      );
    }
    req.query = result.data as typeof req.query;
    next();
  };
}