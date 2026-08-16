import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { ActivityRepository } from './activity.repository.js';

const repo = new ActivityRepository();

export const listTripActivity: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const activity = await repo.findByTrip(tripId);
    res.json(ok(activity, 'Activity retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const listRecentActivity: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.organizationId) {
      throw new AppError(400, 'ORGANIZATION_REQUIRED', 'Organization membership required');
    }
    const activity = await repo.findRecentForOrg(req.user.organizationId);
    res.json(ok(activity, 'Recent activity retrieved successfully'));
  } catch (err) {
    next(err);
  }
};
