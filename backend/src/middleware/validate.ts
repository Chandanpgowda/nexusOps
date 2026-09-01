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