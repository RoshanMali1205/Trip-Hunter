import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { NotificationRepository } from './notification.repository.js';

const repo = new NotificationRepository();

export const listNotifications: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const notifications = await repo.findByUser(req.user.id);
    res.json(ok(notifications, 'Notifications retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const id = String(req.params['id']);
    const notification = await repo.markRead(id, req.user.id);
    res.json(ok(notification, 'Notification updated successfully'));
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    await repo.markAllRead(req.user.id);
    res.json(ok(null, 'All notifications marked as read'));
  } catch (err) {
    next(err);
  }
};
