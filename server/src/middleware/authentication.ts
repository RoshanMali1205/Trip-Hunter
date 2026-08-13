import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { allowMockData } from '../config/env.js';
import {
  getSupabaseAdmin,
  getSupabaseAuthClient,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from '../config/supabase.js';
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
      accessToken?: string;
    }
  }
}

const MOCK_USER: AuthUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'alex@acme.example',
  displayName: 'Alex Rivera',
  organizationId: '22222222-2222-2222-2222-222222222222',
};

function extractBearer(req: Request): string | null {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

async function resolveUserFromToken(token: string): Promise<AuthUser> {
  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired Bearer token');
  }

  const userId = data.user.id;
  const email = data.user.email ?? '';

  if (!isSupabaseAdminConfigured()) {
    return {
      id: userId,
      email,
      displayName:
        (data.user.user_metadata?.['display_name'] as string | undefined) ??
        email.split('@')[0] ??
        'User',
      organizationId: '',
    };
  }

  const db = getSupabaseAdmin();

  const [{ data: profile }, { data: membership }] = await Promise.all([
    db
      .from('profiles')
      .select('id, email, display_name')
      .eq('id', userId)
      .maybeSingle(),
    db
      .from('org_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    id: userId,
    email: profile?.email ?? email,
    displayName:
      profile?.display_name ??
      (data.user.user_metadata?.['display_name'] as string | undefined) ??
      email.split('@')[0] ??
      'User',
    organizationId: membership?.organization_id ?? '',
  };
}

/**
 * Requires `Authorization: Bearer <supabase-access-token>`.
 *
 * When Supabase env is configured, validates the JWT with `auth.getUser`.
 * Otherwise (non-production) accepts any non-empty token and attaches a mock user.
 */
export const authenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token'));
      return;
    }

    req.accessToken = token;

    if (isSupabaseConfigured()) {
      req.user = await resolveUserFromToken(token);
      next();
      return;
    }

    if (!allowMockData()) {
      next(
        new AppError(
          503,
          'SUPABASE_NOT_CONFIGURED',
          'SUPABASE_URL and keys are required in production',
        ),
      );
      return;
    }

    req.user = { ...MOCK_USER };
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuthenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractBearer(req);
    if (!token) {
      next();
      return;
    }

    req.accessToken = token;

    if (isSupabaseConfigured()) {
      req.user = await resolveUserFromToken(token);
    } else if (allowMockData()) {
      req.user = { ...MOCK_USER };
    }
    next();
  } catch {
    // Optional auth: ignore invalid tokens
    next();
  }
};
