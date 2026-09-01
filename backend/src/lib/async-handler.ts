import { Request } from 'express';
import type { NextFunction, Response } from 'express';

/**
 * Wraps an async controller so thrown errors are forwarded to the central
 * error handler instead of producing unhandled promise rejections.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}