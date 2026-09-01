import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './lib/logger';
import { AppError } from './lib/errors';
import { apiLimiter } from './middleware/rate-limit';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nexusops-api', env: env.NODE_ENV });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', usersRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
  });

  // Centralized error handler — never leaks stack traces or internals.
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err instanceof AppError) {
        return res.status(err.statusCode).json({
          success: false,
          message: err.message,
          code: err.code,
          ...(err.details ? { details: err.details } : {}),
        });
      }

      logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  );

  return app;
}
