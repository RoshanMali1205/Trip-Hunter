import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from './error-handler.js';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  organizationId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const MOCK_USER: AuthUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'alex@acme.example',
  displayName: 'Alex Rivera',
  organizationId: '22222222-2222-2222-2222-222222222222',
};

/**
 * Bearer JWT stub: accepts any non-empty Bearer token and attaches a mock user.
 * Replace with Supabase JWT verification before production.
 */
export const authenticate: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Empty Bearer token'));
    return;
  }

  req.user = { ...MOCK_USER };
  next();
};

export const optionalAuthenticate: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    if (token) {
      req.user = { ...MOCK_USER };
    }
  }
  next();
};
