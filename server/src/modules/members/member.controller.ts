import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { TripRepository } from '../trips/trip.repository.js';
import { MemberRepository, type MemberRole, type RsvpStatus } from './member.repository.js';

const repo = new MemberRepository();
const tripRepo = new TripRepository();
const VALID_ROLES: MemberRole[] = ['organizer', 'traveler', 'viewer'];
const VALID_RSVP: RsvpStatus[] = ['pending', 'accepted', 'declined', 'maybe'];

export const listMembers: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const members = await repo.findByTrip(tripId);
    res.json(ok(members, 'Trip members retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const inviteMember: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);

    const trip = await tripRepo.findById(tripId);
    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', `Trip ${tripId} was not found`);
    }
    if (trip.createdBy !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'Only the trip owner can invite members');
    }

    const body = req.body as { email?: unknown; role?: unknown };
    if (typeof body.email !== 'string' || !body.email.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'email is required');
    }
    const role =
      typeof body.role === 'string' && VALID_ROLES.includes(body.role as MemberRole)
        ? (body.role as MemberRole)
        : 'traveler';

    const member = await repo.inviteByEmail(tripId, body.email.trim().toLowerCase(), role);
    res.status(201).json(ok(member, 'Member invited successfully'));
  } catch (err) {
    next(err);
  }
};

export const respondToInvite: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const body = req.body as { rsvpStatus?: unknown };

    if (typeof body.rsvpStatus !== 'string' || !VALID_RSVP.includes(body.rsvpStatus as RsvpStatus)) {
      throw new AppError(400, 'VALIDATION_ERROR', `rsvpStatus must be one of ${VALID_RSVP.join(', ')}`);
    }

    const member = await repo.respondToInvite(tripId, req.user.id, body.rsvpStatus as RsvpStatus);
    res.json(ok(member, 'Response recorded'));
  } catch (err) {
    next(err);
  }
};
