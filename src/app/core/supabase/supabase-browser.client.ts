import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAppConfig, isSupabaseBrowserConfigured } from '../config/app-config';

let client: SupabaseClient | null = null;

/** Browser Supabase client (anon key). null when not configured → demo auth. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseBrowserConfigured()) {
    return null;
  }
  if (client) {
    return client;
  }

  const { supabaseUrl, supabaseAnonKey } = getAppConfig();
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return client;
}
