import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env.js';

let authClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/** True when URL + at least one key are present (public or service role). */
export function isSupabaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.SUPABASE_URL &&
      (env.SUPABASE_PUBLIC_KEY || env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

/** True when service-role credentials exist for privileged DB access. */
export function isSupabaseAdminConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Client used to validate end-user JWTs via `auth.getUser(token)`.
 * Prefers the publishable/anon key so verification stays aligned with Auth.
 */
export function getSupabaseAuthClient(): SupabaseClient {
  if (authClient) {
    return authClient;
  }

  const env = getEnv();
  const key = env.SUPABASE_PUBLIC_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.SUPABASE_URL || !key) {
    throw new Error(
      'Supabase auth client requires SUPABASE_URL and SUPABASE_PUBLIC_KEY (or SERVICE_ROLE_KEY)',
    );
  }

  authClient = createClient(env.SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return authClient;
}

/**
 * Service-role client for server-side queries after middleware has authenticated
 * the caller. Bypasses RLS — keep authorization checks in the API layer.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const env = getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase admin client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
}

/** Test helper — clears cached clients after env changes. */
export function resetSupabaseClients(): void {
  authClient = null;
  adminClient = null;
}
