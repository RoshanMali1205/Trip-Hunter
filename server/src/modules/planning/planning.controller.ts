import type { RequestHandler } from 'express';
import { ok } from '../../types/api.js';
import { PlanningRepository } from './planning.repository.js';

const repo = new PlanningRepository();

export const listAvailability: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const options = await repo.findAvailabilityByTrip(tripId);
    res.json(ok(options, 'Availability retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const listDestinations: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const destinations = await repo.findDestinationsByTrip(tripId);
    res.json(ok(destinations, 'Destinations retrieved successfully'));
  } catch (err) {
    next(err);
  }
};
