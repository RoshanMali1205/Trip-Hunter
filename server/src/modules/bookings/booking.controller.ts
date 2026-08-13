import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { BookingRepository, type CreateBookingInput } from './booking.repository.js';

const repo = new BookingRepository();
const VALID_TYPES: CreateBookingInput['bookingType'][] = [
  'FLIGHT',
  'TRAIN',
  'BUS',
  'HOTEL',
  'CAB',
  'ACTIVITY',
  'OTHER',
];

export const listBookings: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const bookings = await repo.findByTrip(tripId);
    res.json(ok(bookings, 'Bookings retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const createBooking: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const body = req.body as {
      bookingType?: unknown;
      provider?: unknown;
      bookingReference?: unknown;
      amount?: unknown;
      currency?: unknown;
      startDatetime?: unknown;
      endDatetime?: unknown;
    };

    if (typeof body.bookingType !== 'string' || !VALID_TYPES.includes(body.bookingType as CreateBookingInput['bookingType'])) {
      throw new AppError(400, 'VALIDATION_ERROR', `bookingType must be one of ${VALID_TYPES.join(', ')}`);
    }
    if (typeof body.provider !== 'string' || !body.provider.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'provider is required');
    }
    if (typeof body.amount !== 'number' || body.amount < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'amount must be a non-negative number');
    }

    const booking = await repo.create({
      tripId,
      bookingType: body.bookingType as CreateBookingInput['bookingType'],
      provider: body.provider.trim(),
      bookingReference: typeof body.bookingReference === 'string' ? body.bookingReference.trim() : '',
      amountCents: Math.round(body.amount * 100),
      currency: typeof body.currency === 'string' && body.currency ? body.currency : 'INR',
      startDatetime: typeof body.startDatetime === 'string' && body.startDatetime ? body.startDatetime : null,
      endDatetime: typeof body.endDatetime === 'string' && body.endDatetime ? body.endDatetime : null,
      createdBy: req.user?.id ?? null,
    });

    res.status(201).json(ok(booking, 'Booking added successfully'));
  } catch (err) {
    next(err);
  }
};
