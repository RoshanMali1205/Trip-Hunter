import type { RequestHandler } from 'express';
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
