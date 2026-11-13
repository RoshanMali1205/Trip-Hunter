import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { MemberRepository, type TripMember } from '../members/member.repository.js';
import { TripRepository } from '../trips/trip.repository.js';
import { SplitValidationError, customSplits, type SplitMember } from './expense-splits.js';
import { ExpenseRepository, type ExpenseReceiptInput } from './expense.repository.js';

const repo = new ExpenseRepository();
const members = new MemberRepository();
const trips = new TripRepository();
const VALID_CATEGORIES = ['travel', 'lodging', 'food', 'activity', 'supplies', 'other'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RECEIPT_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function splitMembers(tripMembers: TripMember[], payer: SplitMember | null): SplitMember[] {
  const seen = new Set<string>();
  const eligible: SplitMember[] = [];
  for (const member of tripMembers) {
    if (!member.userId || seen.has(member.userId)) {
      continue;
    }
    if (member.rsvpStatus !== 'accepted' && member.role !== 'organizer') {
      continue;
    }
    seen.add(member.userId);
    eligible.push({ userId: member.userId, name: member.name || 'Teammate' });
  }
  if (eligible.length > 0) {
    return eligible;
  }
  if (payer?.userId) {
    return [payer];
  }
  return [];
}

function parseSplits(raw: unknown, amountCents: number, people: SplitMember[]) {
  if (raw == null) {
    return undefined;
  }
  try {
    return customSplits(amountCents, people, raw);
  } catch (err) {
    if (err instanceof SplitValidationError) {
      throw new AppError(400, 'VALIDATION_ERROR', err.message);
    }
    throw err;
  }
}

function receiptMime(fileName: string, mimeType: string): string {
  if (RECEIPT_MIME.has(mimeType)) {
    return mimeType;
  }
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return mimeType;
}

function parseReceipt(raw: unknown): ExpenseReceiptInput | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw !== 'object') {
    throw new AppError(400, 'VALIDATION_ERROR', 'receipt must include a file');
  }
  const body = raw as { fileName?: unknown; mimeType?: unknown; contentBase64?: unknown };
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const contentBase64 = typeof body.contentBase64 === 'string' ? body.contentBase64.trim() : '';
  if (!fileName && !contentBase64) {
    return null;
  }
  if (!fileName || !contentBase64) {
    throw new AppError(400, 'VALIDATION_ERROR', 'receipt file name and content are required');
  }
  const mimeType = receiptMime(
    fileName,
    typeof body.mimeType === 'string' ? body.mimeType.trim() : '',
  );
  if (!RECEIPT_MIME.has(mimeType)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Receipt must be a PDF or an image (JPEG, PNG, WEBP, GIF)',
    );
  }
  return { fileName, mimeType, contentBase64 };
}

export const listExpenses: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const expenses = await repo.findByTrip(tripId);
    res.json(ok(expenses, 'Expenses retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const listSettlements: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const trip = await trips.findById(tripId);
    const settlements = await repo.settlementsForTrip(tripId, trip?.name);
    res.json(ok(settlements, 'Settlements retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const listMySettlements: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const orgTrips = req.user.organizationId
      ? await trips.findByOrganization(req.user.organizationId)
      : [];
    const settlements = await repo.settlementsForTrips(
      orgTrips.map((t) => ({ id: t.id, name: t.name })),
    );
    res.json(ok(settlements, 'Settlements retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const recordSettlementPayment: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const tripId = String(req.params['tripId']);
    const body = req.body as { fromUserId?: unknown; toUserId?: unknown };
    if (typeof body.fromUserId !== 'string' || !body.fromUserId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'fromUserId is required');
    }
    if (typeof body.toUserId !== 'string' || !body.toUserId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'toUserId is required');
    }

    const trip = await trips.findById(tripId);
    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', `Trip ${tripId} was not found`);
    }

    const actor = req.user.id;
    if (actor !== body.fromUserId && actor !== body.toUserId && actor !== trip.createdBy) {
      throw new AppError(403, 'FORBIDDEN', 'Only the payer, payee, or trip owner can mark this paid');
    }

    const settlements = await repo.recordPayment({
      tripId,
      organizationId: trip.organizationId,
      fromUserId: body.fromUserId,
      toUserId: body.toUserId,
      recordedBy: actor,
    });
    res.json(ok(settlements, 'Settlement marked as paid'));
  } catch (err) {
    next(err);
  }
};

export const expenseSummary: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Bearer token');
    }
    const orgTrips = req.user.organizationId
      ? await trips.findByOrganization(req.user.organizationId)
      : [];
    const summary = await repo.summaryForUser(
      orgTrips.map((t) => t.id),
      req.user.id,
    );
    res.json(ok(summary, 'Expense summary retrieved successfully'));
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
      splits?: unknown;
      receipt?: unknown;
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

    const amountCents = Math.round(body.amount * 100);
    const payer = req.user
      ? { userId: req.user.id, name: req.user.displayName ?? req.user.email ?? 'You' }
      : null;
    const people = splitMembers(await members.findByTrip(tripId), payer);
    const receipt = parseReceipt(body.receipt);

    const expense = await repo.create({
      tripId,
      title: body.description.trim(),
      category: body.category,
      amountCents,
      currency: typeof body.currency === 'string' ? body.currency : 'INR',
      incurredOn,
      paidBy: req.user?.id ?? null,
      createdBy: req.user?.id ?? null,
      createdByName: req.user?.displayName ?? req.user?.email,
      organizationId: req.user?.organizationId ?? null,
      memberIds: people,
      splits: parseSplits(body.splits, amountCents, people),
      receipt,
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
