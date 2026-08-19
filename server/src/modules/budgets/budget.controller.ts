import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { BudgetRepository } from './budget.repository.js';

const repo = new BudgetRepository();

export const listBudgetCategories: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const categories = await repo.findCategoriesByTrip(tripId);
    res.json(ok(categories, 'Budget retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const createBudgetCategory: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const body = req.body as { category?: unknown; plannedAmount?: unknown; currency?: unknown };

    if (typeof body.category !== 'string' || !body.category.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'category is required');
    }
    if (typeof body.plannedAmount !== 'number' || body.plannedAmount < 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'plannedAmount must be a non-negative number');
    }

    const category = await repo.createCategory(
      tripId,
      body.category.trim(),
      Math.round(body.plannedAmount * 100),
      typeof body.currency === 'string' ? body.currency : 'INR',
    );
    res.status(201).json(ok(category, 'Budget category created successfully'));
  } catch (err) {
    next(err);
  }
};

export const updateBudgetCategory: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const categoryId = String(req.params['categoryId']);
    const body = req.body as { plannedAmount?: unknown; actualAmount?: unknown };

    const updates: { allocatedCents?: number; spentCents?: number } = {};
    if (typeof body.plannedAmount === 'number') updates.allocatedCents = Math.round(body.plannedAmount * 100);
    if (typeof body.actualAmount === 'number') updates.spentCents = Math.round(body.actualAmount * 100);

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'plannedAmount or actualAmount is required');
    }

    const category = await repo.updateCategory(tripId, categoryId, updates);
    res.json(ok(category, 'Budget category updated successfully'));
  } catch (err) {
    next(err);
  }
};

export const deleteBudgetCategory: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const categoryId = String(req.params['categoryId']);
    await repo.deleteCategory(tripId, categoryId);
    res.json(ok(null, 'Budget category deleted successfully'));
  } catch (err) {
    next(err);
  }
};
