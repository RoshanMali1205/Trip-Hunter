import type { RequestHandler } from 'express';
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
