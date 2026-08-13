import { app } from './index.js';
import { loadEnv, getEnv, allowMockData } from './config/env.js';
import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from './config/supabase.js';

loadEnv();

const { PORT } = getEnv();
app.listen(PORT, () => {
  console.log(`Trip Hunter API listening on http://localhost:${PORT}`);
  console.log(
    `  auth=${isSupabaseConfigured() ? 'supabase' : 'mock'} data=${
      isSupabaseAdminConfigured()
        ? 'supabase'
        : allowMockData()
          ? 'memory'
          : 'unavailable'
    }`,
  );
});
