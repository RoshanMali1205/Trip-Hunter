import type { RequestHandler } from 'express';
import { ok } from '../../types/api.js';
import { ExpenseRepository } from './expense.repository.js';

const repo = new ExpenseRepository();

export const listExpenses: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const expenses = await repo.findByTrip(tripId);
    res.json(ok(expenses, 'Expenses retrieved successfully'));
  } catch (err) {
    next(err);
  }
};
