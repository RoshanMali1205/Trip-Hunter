import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { PlanningRepository, type AvailVote } from './planning.repository.js';
import { TripRepository } from '../trips/trip.repository.js';

const repo = new PlanningRepository();
const trips = new TripRepository();
const VALID_VOTES: AvailVote[] = ['available', 'maybe', 'not'];

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export const listAvailability: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const options = await repo.findAvailabilityByTrip(tripId);
    res.json(ok(options, 'Availability retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const createAvailabilityOption: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const body = req.body as { startDate?: unknown; endDate?: unknown; label?: unknown };

    if (typeof body.startDate !== 'string' || !isIsoDate(body.startDate)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'startDate must be YYYY-MM-DD');
    }
    if (typeof body.endDate !== 'string' || !isIsoDate(body.endDate)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'endDate must be YYYY-MM-DD');
    }
    if (body.endDate < body.startDate) {
      throw new AppError(400, 'VALIDATION_ERROR', 'endDate must be on or after startDate');
    }

    const option = await repo.createAvailabilityOption({
      tripId,
      startDate: body.startDate,
      endDate: body.endDate,
      label: typeof body.label === 'string' ? body.label.trim() : null,
      createdBy: req.user.id,
    });
    res.status(201).json(ok(option, 'Availability option created'));
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

export const createDestination: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const body = req.body as {
      destinationName?: unknown;
      city?: unknown;
      country?: unknown;
      description?: unknown;
      estimatedCost?: unknown;
      imageUrl?: unknown;
    };

    if (typeof body.destinationName !== 'string' || !body.destinationName.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'destinationName is required');
    }
    if (typeof body.estimatedCost === 'number' && body.estimatedCost < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'estimatedCost must be non-negative');
    }

    const destination = await repo.createDestination({
      tripId,
      destinationName: body.destinationName.trim(),
      city: typeof body.city === 'string' ? body.city.trim() : '',
      country: typeof body.country === 'string' ? body.country.trim() : 'India',
      description: typeof body.description === 'string' ? body.description.trim() : '',
      estimatedCostCents:
        typeof body.estimatedCost === 'number' ? Math.round(body.estimatedCost * 100) : 0,
      imageUrl: typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null,
    });
    res.status(201).json(ok(destination, 'Destination option created'));
  } catch (err) {
    next(err);
  }
};

export const getMyVotes: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const votes = await repo.findMyVotes(tripId, req.user.id);
    res.json(ok(votes, 'Votes retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const castAvailabilityVote: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const body = req.body as { startDate?: unknown; endDate?: unknown; vote?: unknown };

    if (typeof body.startDate !== 'string' || typeof body.endDate !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'startDate and endDate are required');
    }
    if (typeof body.vote !== 'string' || !VALID_VOTES.includes(body.vote as AvailVote)) {
      throw new AppError(400, 'VALIDATION_ERROR', `vote must be one of ${VALID_VOTES.join(', ')}`);
    }

    await repo.castAvailabilityVote(tripId, req.user.id, body.startDate, body.endDate, body.vote as AvailVote);
    res.json(ok(null, 'Vote recorded'));
  } catch (err) {
    next(err);
  }
};

export const castDestinationVote: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const destinationId = String(req.params['destinationId']);
    await repo.castDestinationVote(tripId, req.user.id, destinationId);
    res.json(ok(null, 'Vote recorded'));
  } catch (err) {
    next(err);
  }
};

export const selectDestination: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const destinationId = String(req.params['destinationId']);
    const trip = await trips.findById(tripId);
    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', `Trip ${tripId} was not found`);
    }
    if (trip.createdBy !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'Only the trip owner can lock the destination');
    }

    const destination = await repo.selectDestination(tripId, destinationId);
    const summary = [destination.destinationName, destination.city].filter(Boolean).join(', ');
    await trips.update(tripId, {
      destination: summary || destination.destinationName,
      status: trip.status === 'draft' ? 'planning' : trip.status,
    });
    res.json(ok(destination, 'Destination locked'));
  } catch (err) {
    next(err);
  }
};

export const selectAvailabilityOption: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const body = req.body as { startDate?: unknown; endDate?: unknown };
    if (typeof body.startDate !== 'string' || !isIsoDate(body.startDate)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'startDate must be YYYY-MM-DD');
    }
    if (typeof body.endDate !== 'string' || !isIsoDate(body.endDate)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'endDate must be YYYY-MM-DD');
    }

    const trip = await trips.findById(tripId);
    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', `Trip ${tripId} was not found`);
    }
    if (trip.createdBy !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'Only the trip owner can lock trip dates');
    }

    const option = await repo.selectAvailabilityOption(tripId, body.startDate, body.endDate, req.user.id);
    await trips.update(tripId, {
      startDate: option.startDate,
      endDate: option.endDate,
      status: trip.status === 'draft' ? 'planning' : trip.status,
    });
    res.json(ok(option, 'Trip dates locked'));
  } catch (err) {
    next(err);
  }
};
