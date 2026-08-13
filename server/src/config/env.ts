import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/** Load `.env` from cwd or repo root when running under `server/`. */
function loadDotenvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      loadDotenv({ path, override: false });
    }
  }
}

loadDotenvFiles();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLIC_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  EMAIL_API_KEY: z.string().min(1).optional(),
  /**
   * When true (default in development), missing Supabase credentials fall back
   * to the in-memory mock user / trips. Production refuses the fallback.
   */
  ALLOW_MOCK_DATA: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v === 'true';
    }),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function getEnv(): Env {
  if (!cached) {
    return loadEnv();
  }
  return cached;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/** Whether the API may serve in-memory stubs when Supabase is not configured. */
export function allowMockData(): boolean {
  const env = getEnv();
  if (env.ALLOW_MOCK_DATA !== undefined) {
    return env.ALLOW_MOCK_DATA;
  }
  return env.NODE_ENV !== 'production';
}

/** Test helper — clears cached env. */
export function resetEnvCache(): void {
  cached = null;
}
