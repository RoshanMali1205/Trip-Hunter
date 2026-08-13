import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { TripService } from './trip.service.js';

const tripService = new TripService();

export const listTrips: RequestHandler = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || undefined;
    const trips = await tripService.listTrips(organizationId);
    res.json(ok(trips, 'Trips retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getTrip: RequestHandler = async (req, res, next) => {
  try {
    const id = String(req.params['id']);
    const trip = await tripService.getTrip(id);
    res.json(ok(trip, 'Trip retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const createTrip: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as {
      name?: unknown;
      description?: unknown;
      destination?: unknown;
      startDate?: unknown;
      endDate?: unknown;
      currency?: unknown;
      budgetCents?: unknown;
    };

    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'name is required');
    }

    const trip = await tripService.createTrip({
      organizationId: req.user?.organizationId,
      name: body.name.trim(),
      description: typeof body.description === 'string' ? body.description : undefined,
      destination: typeof body.destination === 'string' ? body.destination : undefined,
      startDate: typeof body.startDate === 'string' ? body.startDate : null,
      endDate: typeof body.endDate === 'string' ? body.endDate : null,
      currency: typeof body.currency === 'string' ? body.currency : undefined,
      budgetCents: typeof body.budgetCents === 'number' ? body.budgetCents : undefined,
      createdBy: req.user?.id ?? null,
    });
    res.status(201).json(ok(trip, 'Trip created successfully'));
  } catch (err) {
    next(err);
  }
};
