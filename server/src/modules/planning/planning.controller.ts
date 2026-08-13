import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { PlanningRepository, type AvailVote } from './planning.repository.js';

const repo = new PlanningRepository();
const VALID_VOTES: AvailVote[] = ['available', 'maybe', 'not'];

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
