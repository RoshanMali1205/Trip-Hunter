import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { TaskRepository, type TaskStatus } from './task.repository.js';

const repo = new TaskRepository();
const VALID_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];

export const listTasks: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const tasks = await repo.findByTrip(tripId);
    res.json(ok(tasks, 'Tasks retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const listMyOrgTasks: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tasks = req.user.organizationId
      ? await repo.findByOrganization(req.user.organizationId)
      : [];
    res.json(ok(tasks, 'Tasks retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const updateTaskStatus: RequestHandler = async (req, res, next) => {
  try {
    const id = String(req.params['id']);
    const status = (req.body as { status?: unknown }).status;

    if (typeof status !== 'string' || !VALID_STATUSES.includes(status as TaskStatus)) {
      throw new AppError(400, 'VALIDATION_ERROR', `status must be one of ${VALID_STATUSES.join(', ')}`);
    }

    const task = await repo.updateStatus(id, status as TaskStatus);
    res.json(ok(task, 'Task updated successfully'));
  } catch (err) {
    next(err);
  }
};
