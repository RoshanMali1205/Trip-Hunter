import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import {
  TripService,
  type TripApprovalStatus,
  type TripStatus,
  type TripType,
} from './trip.service.js';

const tripService = new TripService();

const VALID_TRIP_TYPES: TripType[] = [
  'business',
  'team_outing',
  'corporate_offsite',
  'training_conference',
  'project_visit',
  'personal_group',
];

const VALID_STATUSES: TripStatus[] = [
  'draft',
  'planning',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

const VALID_APPROVAL: TripApprovalStatus[] = [
  'not_required',
  'pending',
  'approved',
  'rejected',
  'changes_requested',
];

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalDate(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export const listTrips: RequestHandler = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId || undefined;
    const userId = req.user?.id;
    const trips = await tripService.listTrips(organizationId, userId);
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
    const body = req.body as Record<string, unknown>;

    if (typeof body['name'] !== 'string' || !String(body['name']).trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'name is required');
    }

    const tripType = optionalString(body['tripType']) as TripType | undefined;
    if (tripType && !VALID_TRIP_TYPES.includes(tripType)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `tripType must be one of ${VALID_TRIP_TYPES.join(', ')}`,
      );
    }

    const trip = await tripService.createTrip({
      organizationId: req.user?.organizationId,
      name: String(body['name']).trim(),
      description: optionalString(body['description']),
      destination: optionalString(body['destination']),
      origin: optionalString(body['origin']),
      tripType,
      startDate: optionalDate(body['startDate']) ?? null,
      endDate: optionalDate(body['endDate']) ?? null,
      currency: optionalString(body['currency']),
      budgetCents: optionalNumber(body['budgetCents']),
      maxMembers: optionalNumber(body['maxMembers']) ?? null,
      approvalRequired: body['approvalRequired'] === true,
      createdBy: req.user?.id ?? null,
      createdByName: req.user?.displayName ?? req.user?.email,
    });
    res.status(201).json(ok(trip, 'Trip created successfully'));
  } catch (err) {
    next(err);
  }
};

export const updateTrip: RequestHandler = async (req, res, next) => {
  try {
    const id = String(req.params['id']);
    const body = req.body as Record<string, unknown>;

    const tripType = optionalString(body['tripType']) as TripType | undefined;
    if (tripType && !VALID_TRIP_TYPES.includes(tripType)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `tripType must be one of ${VALID_TRIP_TYPES.join(', ')}`,
      );
    }

    const status = optionalString(body['status']) as TripStatus | undefined;
    if (status && !VALID_STATUSES.includes(status)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `status must be one of ${VALID_STATUSES.join(', ')}`,
      );
    }

    const approvalStatus = optionalString(body['approvalStatus']) as
      | TripApprovalStatus
      | undefined;
    if (approvalStatus && !VALID_APPROVAL.includes(approvalStatus)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `approvalStatus must be one of ${VALID_APPROVAL.join(', ')}`,
      );
    }

    const trip = await tripService.updateTrip(
      id,
      {
        name: optionalString(body['name'])?.trim(),
        description: optionalString(body['description']),
        destination: optionalString(body['destination']),
        origin: optionalString(body['origin']),
        tripType,
        status,
        approvalStatus,
        startDate: optionalDate(body['startDate']),
        endDate: optionalDate(body['endDate']),
        currency: optionalString(body['currency']),
        budgetCents: optionalNumber(body['budgetCents']),
        maxMembers:
          body['maxMembers'] === null
            ? null
            : (optionalNumber(body['maxMembers']) ?? undefined),
      },
      {
        id: req.user?.id ?? '',
        name: req.user?.displayName ?? req.user?.email,
      },
    );
    res.json(ok(trip, 'Trip updated successfully'));
  } catch (err) {
    next(err);
  }
};

export const deleteTrip: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const id = String(req.params['id']);
    await tripService.deleteTrip(
      id,
      req.user.id,
      req.user.displayName ?? req.user.email,
    );
    res.json(ok(null, 'Trip deleted successfully'));
  } catch (err) {
    next(err);
  }
};
