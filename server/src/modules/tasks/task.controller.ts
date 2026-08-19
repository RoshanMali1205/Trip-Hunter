import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { TaskRepository, type TaskPriority, type TaskStatus } from './task.repository.js';

const repo = new TaskRepository();
const VALID_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];
const VALID_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

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

export const createTask: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const body = req.body as {
      title?: unknown;
      description?: unknown;
      priority?: unknown;
      assignedTo?: unknown;
      dueDate?: unknown;
    };

    if (typeof body.title !== 'string' || !body.title.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'title is required');
    }

    const priority =
      typeof body.priority === 'string' && VALID_PRIORITIES.includes(body.priority as TaskPriority)
        ? (body.priority as TaskPriority)
        : 'MEDIUM';

    const task = await repo.create({
      tripId,
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description : undefined,
      priority,
      assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo : null,
      dueDate: typeof body.dueDate === 'string' ? body.dueDate : null,
      createdBy: req.user?.id ?? null,
      createdByName: req.user?.displayName ?? req.user?.email,
      organizationId: req.user?.organizationId ?? null,
    });
    res.status(201).json(ok(task, 'Task created successfully'));
  } catch (err) {
    next(err);
  }
};

export const updateTaskStatus: RequestHandler = async (req, res, next) => {
  try {
    const id = String(req.params['id']);
    const body = req.body as { status?: unknown; assignedTo?: unknown };
    const patch: { status?: TaskStatus; assignedTo?: string | null } = {};

    if (typeof body.status === 'string') {
      if (!VALID_STATUSES.includes(body.status as TaskStatus)) {
        throw new AppError(400, 'VALIDATION_ERROR', `status must be one of ${VALID_STATUSES.join(', ')}`);
      }
      patch.status = body.status as TaskStatus;
    }
    if (body.assignedTo === null || typeof body.assignedTo === 'string') {
      patch.assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo : null;
    }

    const task = await repo.update(id, patch);
    res.json(ok(task, 'Task updated successfully'));
  } catch (err) {
    next(err);
  }
};
