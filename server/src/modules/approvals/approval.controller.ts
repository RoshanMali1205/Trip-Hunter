import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { ApprovalRepository } from './approval.repository.js';

const repo = new ApprovalRepository();

export const listTripApprovals: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const approvals = await repo.findByTrip(tripId);
    res.json(ok(approvals, 'Approvals retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const listPendingApprovals: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.organizationId) {
      throw new AppError(400, 'ORGANIZATION_REQUIRED', 'Organization membership required');
    }
    const approvals = await repo.findPendingForOrg(req.user.organizationId);
    res.json(ok(approvals, 'Pending approvals retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const reviewApproval: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const id = String(req.params['id']);
    const body = req.body as { status?: unknown; notes?: unknown };
    if (body.status !== 'APPROVED' && body.status !== 'REJECTED') {
      throw new AppError(400, 'VALIDATION_ERROR', 'status must be APPROVED or REJECTED');
    }
    const approval = await repo.review(
      id,
      body.status,
      req.user.id,
      typeof body.notes === 'string' ? body.notes : undefined,
    );
    res.json(ok(approval, 'Approval updated successfully'));
  } catch (err) {
    next(err);
  }
};
