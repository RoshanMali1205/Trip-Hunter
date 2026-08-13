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
import { listMembers } from './modules/members/member.controller.js';
import {
  castAvailabilityVote,
  castDestinationVote,
  getMyVotes,
  listAvailability,
  listDestinations,
} from './modules/planning/planning.controller.js';
import { listItinerary } from './modules/itinerary/itinerary.controller.js';
import { listBookings } from './modules/bookings/booking.controller.js';
import { listBudgetCategories } from './modules/budgets/budget.controller.js';
import { listExpenses } from './modules/expenses/expense.controller.js';
import { listMyOrgTasks, listTasks, updateTaskStatus } from './modules/tasks/task.controller.js';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './modules/notifications/notification.controller.js';
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

  v1.get('/trips/:tripId/members', authenticate, listMembers);
  v1.get('/trips/:tripId/availability', authenticate, listAvailability);
  v1.get('/trips/:tripId/destinations', authenticate, listDestinations);
  v1.get('/trips/:tripId/votes/me', authenticate, getMyVotes);
  v1.post('/trips/:tripId/availability/vote', authenticate, castAvailabilityVote);
  v1.post('/trips/:tripId/destinations/:destinationId/vote', authenticate, castDestinationVote);
  v1.get('/trips/:tripId/itinerary', authenticate, listItinerary);
  v1.get('/trips/:tripId/bookings', authenticate, listBookings);
  v1.get('/trips/:tripId/budget', authenticate, listBudgetCategories);
  v1.get('/trips/:tripId/expenses', authenticate, listExpenses);
  v1.get('/trips/:tripId/tasks', authenticate, listTasks);
  v1.get('/tasks', authenticate, listMyOrgTasks);
  v1.patch('/tasks/:id', authenticate, updateTaskStatus);

  v1.get('/notifications', authenticate, listNotifications);
  v1.patch('/notifications/:id/read', authenticate, markNotificationRead);
  v1.post('/notifications/read-all', authenticate, markAllNotificationsRead);

  app.use('/api/v1', v1);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();

export default app;
