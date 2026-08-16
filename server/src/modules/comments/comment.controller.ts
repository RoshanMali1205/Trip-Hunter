import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { CommentRepository, type CommentSubjectType } from './comment.repository.js';

const repo = new CommentRepository();
const VALID_SUBJECTS: CommentSubjectType[] = [
  'trip',
  'task',
  'expense',
  'booking',
  'document',
  'itinerary',
];

export const listComments: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const comments = await repo.findByTrip(tripId);
    res.json(ok(comments, 'Comments retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const createComment: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const body = req.body as {
      body?: unknown;
      subjectType?: unknown;
      subjectId?: unknown;
      parentId?: unknown;
    };

    if (typeof body.body !== 'string' || !body.body.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'body is required');
    }

    const subjectType =
      typeof body.subjectType === 'string' &&
      VALID_SUBJECTS.includes(body.subjectType as CommentSubjectType)
        ? (body.subjectType as CommentSubjectType)
        : 'trip';

    const comment = await repo.create({
      tripId,
      body: body.body.trim(),
      subjectType,
      subjectId: typeof body.subjectId === 'string' ? body.subjectId : null,
      parentId: typeof body.parentId === 'string' ? body.parentId : null,
      authorId: req.user.id,
      authorName: req.user.displayName ?? req.user.email,
      organizationId: req.user.organizationId ?? null,
    });
    res.status(201).json(ok(comment, 'Comment added successfully'));
  } catch (err) {
    next(err);
  }
};

export const deleteComment: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const id = String(req.params['id']);
    await repo.delete(tripId, id, req.user.id);
    res.json(ok(null, 'Comment deleted successfully'));
  } catch (err) {
    next(err);
  }
};
