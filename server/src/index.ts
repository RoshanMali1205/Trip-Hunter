import cors from 'cors';
import express from 'express';
import { loadEnv, allowMockData } from './config/env.js';
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
  createTrip,
  getTrip,
  listTrips,
} from './modules/trips/trip.controller.js';
import { ok } from './types/api.js';

// Safe to import from Netlify Functions (no import.meta / listen side effects).
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
  v1.post('/trips', authenticate, createTrip);

  app.use('/api/v1', v1);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();

export default app;
