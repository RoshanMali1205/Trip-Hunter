import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { ItineraryRepository, type ItineraryItemType } from './itinerary.repository.js';

const repo = new ItineraryRepository();
const VALID_TYPES: ItineraryItemType[] = ['TRAVEL', 'HOTEL', 'FOOD', 'ACTIVITY', 'MEETING', 'OTHER'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export const listItinerary: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const days = await repo.findByTrip(tripId);
    res.json(ok(days, 'Itinerary retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const createItineraryItem: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const body = req.body as {
      title?: unknown;
      description?: unknown;
      type?: unknown;
      date?: unknown;
      startTime?: unknown;
      endTime?: unknown;
      locationName?: unknown;
    };

    if (typeof body.title !== 'string' || !body.title.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'title is required');
    }
    if (typeof body.date !== 'string' || !DATE_RE.test(body.date)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'date is required in YYYY-MM-DD format');
    }
    if (typeof body.type !== 'string' || !VALID_TYPES.includes(body.type as ItineraryItemType)) {
      throw new AppError(400, 'VALIDATION_ERROR', `type must be one of ${VALID_TYPES.join(', ')}`);
    }
    const startTime = typeof body.startTime === 'string' && TIME_RE.test(body.startTime) ? body.startTime : '';
    const endTime = typeof body.endTime === 'string' && TIME_RE.test(body.endTime) ? body.endTime : '';

    await repo.create({
      tripId,
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : '',
      type: body.type as ItineraryItemType,
      date: body.date,
      startTime,
      endTime,
      locationName: typeof body.locationName === 'string' ? body.locationName : '',
      createdBy: req.user?.id ?? null,
    });

    res.status(201).json(ok(null, 'Itinerary item added successfully'));
  } catch (err) {
    next(err);
  }
};
