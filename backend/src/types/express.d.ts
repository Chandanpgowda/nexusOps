import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Populated by `authenticate` middleware. */
      user?: {
        id: string;
        email: string;
        roles: string[];
        permissions: string[];
      };
    }
  }
}

export {};