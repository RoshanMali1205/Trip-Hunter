export interface TripHunterRuntimeEnv {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
}

declare global {
  interface Window {
    __TRIP_HUNTER_ENV__?: TripHunterRuntimeEnv;
  }
}

/**
 * Browser config. Prefer runtime `public/env.js` (Netlify injects secrets at
 * build/deploy). Fall back to empty → demo auth mode without Supabase.
 */
export function getAppConfig(): Required<TripHunterRuntimeEnv> {
  const runtime =
    typeof window !== 'undefined' ? window.__TRIP_HUNTER_ENV__ : undefined;

  return {
    supabaseUrl: (runtime?.supabaseUrl ?? '').trim(),
    supabaseAnonKey: (runtime?.supabaseAnonKey ?? '').trim(),
    apiBaseUrl: (runtime?.apiBaseUrl ?? '/api/v1').trim() || '/api/v1',
  };
}

export function isSupabaseBrowserConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = getAppConfig();
  return Boolean(supabaseUrl && supabaseAnonKey);
}
