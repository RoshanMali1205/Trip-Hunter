import type { RequestHandler } from 'express';
import { ok } from '../../types/api.js';
import { ItineraryRepository } from './itinerary.repository.js';

const repo = new ItineraryRepository();

export const listItinerary: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const days = await repo.findByTrip(tripId);
    res.json(ok(days, 'Itinerary retrieved successfully'));
  } catch (err) {
    next(err);
  }
};
