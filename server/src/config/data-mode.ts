import { allowMockData } from './env.js';
import { isSupabaseAdminConfigured } from './supabase.js';
import { AppError } from '../middleware/error-handler.js';

/** Supabase when configured, else in-memory mock (dev only) — else refuse. */
export function assertDbOrMock(resource: string): 'supabase' | 'memory' {
  if (isSupabaseAdminConfigured()) {
    return 'supabase';
  }
  if (allowMockData()) {
    return 'memory';
  }
  throw new AppError(
    503,
    'SUPABASE_NOT_CONFIGURED',
    `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to query ${resource}`,
  );
}
