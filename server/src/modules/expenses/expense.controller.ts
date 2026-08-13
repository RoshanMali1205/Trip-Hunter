import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { ExpenseRepository } from './expense.repository.js';

const repo = new ExpenseRepository();
const VALID_CATEGORIES = ['travel', 'lodging', 'food', 'activity', 'supplies', 'other'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const listExpenses: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const expenses = await repo.findByTrip(tripId);
    res.json(ok(expenses, 'Expenses retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const createExpense: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const body = req.body as {
      description?: unknown;
      category?: unknown;
      amount?: unknown;
      currency?: unknown;
      expenseDate?: unknown;
    };

    if (typeof body.description !== 'string' || !body.description.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'description is required');
    }
    if (typeof body.category !== 'string' || !VALID_CATEGORIES.includes(body.category)) {
      throw new AppError(400, 'VALIDATION_ERROR', `category must be one of ${VALID_CATEGORIES.join(', ')}`);
    }
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'amount must be a positive number');
    }
    const incurredOn =
      typeof body.expenseDate === 'string' && DATE_RE.test(body.expenseDate)
        ? body.expenseDate
        : new Date().toISOString().slice(0, 10);

    const expense = await repo.create({
      tripId,
      title: body.description.trim(),
      category: body.category,
      amountCents: Math.round(body.amount * 100),
      currency: typeof body.currency === 'string' ? body.currency : 'INR',
      incurredOn,
      paidBy: req.user?.id ?? null,
      createdBy: req.user?.id ?? null,
    });
    res.status(201).json(ok(expense, 'Expense added successfully'));
  } catch (err) {
    next(err);
  }
};

export const updateExpenseStatus: RequestHandler = async (req, res, next) => {
  try {
    const id = String(req.params['id']);
    const status = (req.body as { status?: unknown }).status;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new AppError(400, 'VALIDATION_ERROR', 'status must be APPROVED or REJECTED');
    }

    const expense = await repo.updateStatus(id, status);
    res.json(ok(expense, 'Expense updated successfully'));
  } catch (err) {
    next(err);
  }
};
