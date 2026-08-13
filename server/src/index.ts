import cors from 'cors';
import express from 'express';
import { pathToFileURL } from 'node:url';
import { loadEnv, getEnv, allowMockData } from './config/env.js';
import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from './config/supabase.js';
import { authenticate } from './middleware/authentication.js';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/error-handler.js';
import {
  getTrip,
  listTrips,
} from './modules/trips/trip.controller.js';
import { ok } from './types/api.js';

loadEnv();

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const v1 = express.Router();

  v1.get('/health', (_req, res) => {
    const dataMode = isSupabaseAdminConfigured()
      ? 'supabase'
      : allowMockData()
        ? 'memory'
        : 'unavailable';

    res.json(
      ok(
        {
          status: 'ok',
          service: 'trip-hunter-api',
          version: 'v1',
          auth: isSupabaseConfigured() ? 'supabase' : 'mock',
          data: dataMode,
          timestamp: new Date().toISOString(),
        },
        'Healthy',
      ),
    );
  });

  v1.get('/me', authenticate, (req, res) => {
    res.json(ok(req.user, 'Current user'));
  });

  v1.get('/trips', authenticate, listTrips);
  v1.get('/trips/:id', authenticate, getTrip);

  app.use('/api/v1', v1);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun && !process.env['NETLIFY']) {
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
}

export default app;
