import type { RequestHandler } from 'express';
import { ok } from '../../types/api.js';
import { BookingRepository } from './booking.repository.js';

const repo = new BookingRepository();

export const listBookings: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const bookings = await repo.findByTrip(tripId);
    res.json(ok(bookings, 'Bookings retrieved successfully'));
  } catch (err) {
    next(err);
  }
};
