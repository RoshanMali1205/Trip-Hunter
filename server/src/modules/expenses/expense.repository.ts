import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';
import { recordActivity } from '../activity/activity.repository.js';

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Expense {
  id: string;
  tripId: string;
  paidBy: string;
  paidByName: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: ExpenseStatus;
}

export interface SettlementLine {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  currency: string;
  message: string;
}

export interface ExpenseSummary {
  youPaid: number;
  yourShare: number;
  youReceive: number;
  currency: string;
}

interface ExpenseRow {
  id: string;
  trip_id: string;
  paid_by: string | null;
  category: string;
  title: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  incurred_on: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  profiles: { display_name: string } | null;
}

interface SplitRow {
  expense_id: string;
  user_id: string;
  share_cents: number;
  profiles: { display_name: string } | null;
}

const STATUS_MAP: Record<ExpenseRow['status'], ExpenseStatus> = {
  draft: 'PENDING',
  submitted: 'PENDING',
  approved: 'APPROVED',
  reimbursed: 'APPROVED',
  rejected: 'REJECTED',
};

const memoryExpenses: Expense[] = [];
const memorySplits = new Map<string, { userId: string; name: string; shareCents: number }[]>();

function mapRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    paidBy: row.paid_by ?? '',
    paidByName: row.profiles?.display_name ?? 'Unknown',
    category: row.category,
    description: row.description ?? row.title,
    amount: row.amount_cents / 100,
    currency: row.currency,
    expenseDate: row.incurred_on,
    status: STATUS_MAP[row.status],
  };
}

const EXPENSE_SELECT =
  'id, trip_id, paid_by, category, title, description, amount_cents, currency, incurred_on, status, profiles!paid_by(display_name)';

export interface CreateExpenseInput {
  tripId: string;
  title: string;
  category: string;
  amountCents: number;
  currency: string;
  incurredOn: string;
  paidBy: string | null;
  createdBy: string | null;
  createdByName?: string;
  organizationId?: string | null;
  memberIds?: { userId: string; name: string }[];
}

function splitEvenly(
  amountCents: number,
  members: { userId: string; name: string }[],
): { userId: string; name: string; shareCents: number }[] {
  if (members.length === 0) {
    return [];
  }
  const base = Math.floor(amountCents / members.length);
  let remainder = amountCents - base * members.length;
  return members.map((m) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { userId: m.userId, name: m.name, shareCents: base + extra };
  });
}

function settleBalances(
  balances: Map<string, { name: string; cents: number }>,
  currency: string,
): SettlementLine[] {
  const debtors: { userId: string; name: string; cents: number }[] = [];
  const creditors: { userId: string; name: string; cents: number }[] = [];

  for (const [userId, bal] of balances) {
    if (bal.cents < -1) {
      debtors.push({ userId, name: bal.name, cents: -bal.cents });
    } else if (bal.cents > 1) {
      creditors.push({ userId, name: bal.name, cents: bal.cents });
    }
  }

  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const lines: SettlementLine[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]!;
    const c = creditors[j]!;
    const amountCents = Math.min(d.cents, c.cents);
    const amount = amountCents / 100;
    lines.push({
      fromUserId: d.userId,
      fromName: d.name,
      toUserId: c.userId,
      toName: c.name,
      amount,
      currency,
      message: `${d.name} owes ${c.name} ₹${amount.toLocaleString('en-IN')}`,
    });
    d.cents -= amountCents;
    c.cents -= amountCents;
    if (d.cents <= 1) i += 1;
    if (c.cents <= 1) j += 1;
  }
  return lines;
}

export class ExpenseRepository {
  async findByTrip(tripId: string): Promise<Expense[]> {
    if (assertDbOrMock('expenses') === 'memory') {
      return memoryExpenses.filter((e) => e.tripId === tripId);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('expenses')
      .select(EXPENSE_SELECT)
      .eq('trip_id', tripId)
      .order('incurred_on', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as ExpenseRow[]).map(mapRow);
  }

  async create(input: CreateExpenseInput): Promise<Expense> {
    const members =
      input.memberIds && input.memberIds.length > 0
        ? input.memberIds
        : input.paidBy
          ? [{ userId: input.paidBy, name: input.createdByName ?? 'You' }]
          : [];
    const splits = splitEvenly(input.amountCents, members);

    if (assertDbOrMock('expenses') === 'memory') {
      const expense: Expense = {
        id: randomUUID(),
        tripId: input.tripId,
        paidBy: input.paidBy ?? '',
        paidByName: input.createdByName ?? 'Unknown',
        category: input.category,
        description: input.title,
        amount: input.amountCents / 100,
        currency: input.currency,
        expenseDate: input.incurredOn,
        status: 'PENDING',
      };
      memoryExpenses.unshift(expense);
      memorySplits.set(expense.id, splits);
      await recordActivity({
        organizationId: input.organizationId ?? null,
        tripId: input.tripId,
        actorId: input.createdBy,
        actorName: input.createdByName,
        action: 'created',
        entityType: 'expense',
        entityId: expense.id,
        message: `${input.createdByName ?? 'Someone'} added expense “${expense.description}”`,
      });
      return expense;
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('expenses')
      .insert({
        trip_id: input.tripId,
        title: input.title,
        category: input.category,
        amount_cents: input.amountCents,
        currency: input.currency,
        incurred_on: input.incurredOn,
        paid_by: input.paidBy,
        created_by: input.createdBy,
      })
      .select(EXPENSE_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const expense = mapRow(data as unknown as ExpenseRow);

    if (splits.length > 0) {
      const { error: splitError } = await db.from('expense_splits').insert(
        splits.map((s) => ({
          expense_id: expense.id,
          user_id: s.userId,
          share_cents: s.shareCents,
          share_pct: Math.round((s.shareCents / input.amountCents) * 10000) / 100,
        })),
      );
      if (splitError) {
        console.warn('expense_splits insert failed:', splitError.message);
      }
    }

    await recordActivity({
      organizationId: input.organizationId ?? null,
      tripId: input.tripId,
      actorId: input.createdBy,
      actorName: input.createdByName,
      action: 'created',
      entityType: 'expense',
      entityId: expense.id,
      message: `${input.createdByName ?? 'Someone'} added expense “${expense.description}”`,
    });

    return expense;
  }

  async updateStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<Expense> {
    if (assertDbOrMock('expenses') === 'memory') {
      const expense = memoryExpenses.find((e) => e.id === id);
      if (!expense) {
        throw new AppError(404, 'EXPENSE_NOT_FOUND', `Expense ${id} was not found`);
      }
      expense.status = status;
      return expense;
    }

    const dbStatus = status === 'APPROVED' ? 'approved' : 'rejected';

    const { data, error } = await getSupabaseAdmin()
      .from('expenses')
      .update({ status: dbStatus })
      .eq('id', id)
      .select(EXPENSE_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'EXPENSE_NOT_FOUND', `Expense ${id} was not found`);
    }

    return mapRow(data as unknown as ExpenseRow);
  }

  async settlementsForTrip(tripId: string): Promise<SettlementLine[]> {
    const expenses = (await this.findByTrip(tripId)).filter((e) => e.status === 'APPROVED');
    if (expenses.length === 0) {
      return [];
    }

    const balances = new Map<string, { name: string; cents: number }>();
    const currency = expenses[0]?.currency ?? 'INR';

    const ensure = (userId: string, name: string) => {
      if (!balances.has(userId)) {
        balances.set(userId, { name, cents: 0 });
      }
    };

    if (assertDbOrMock('expenses') === 'memory') {
      for (const expense of expenses) {
        ensure(expense.paidBy, expense.paidByName);
        balances.get(expense.paidBy)!.cents += Math.round(expense.amount * 100);
        const splits = memorySplits.get(expense.id) ?? [
          {
            userId: expense.paidBy,
            name: expense.paidByName,
            shareCents: Math.round(expense.amount * 100),
          },
        ];
        for (const split of splits) {
          ensure(split.userId, split.name);
          balances.get(split.userId)!.cents -= split.shareCents;
        }
      }
      return settleBalances(balances, currency);
    }

    const db = getSupabaseAdmin();
    const { data: splits, error } = await db
      .from('expense_splits')
      .select('expense_id, user_id, share_cents, profiles!user_id(display_name)')
      .in(
        'expense_id',
        expenses.map((e) => e.id),
      );

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const splitsByExpense = new Map<string, SplitRow[]>();
    for (const row of (splits ?? []) as unknown as SplitRow[]) {
      const list = splitsByExpense.get(row.expense_id) ?? [];
      list.push(row);
      splitsByExpense.set(row.expense_id, list);
    }

    for (const expense of expenses) {
      ensure(expense.paidBy, expense.paidByName);
      balances.get(expense.paidBy)!.cents += Math.round(expense.amount * 100);

      const expenseSplits = splitsByExpense.get(expense.id);
      if (expenseSplits && expenseSplits.length > 0) {
        for (const split of expenseSplits) {
          ensure(split.user_id, split.profiles?.display_name ?? 'Teammate');
          balances.get(split.user_id)!.cents -= split.share_cents;
        }
      } else {
        balances.get(expense.paidBy)!.cents -= Math.round(expense.amount * 100);
      }
    }

    return settleBalances(balances, currency);
  }

  async summaryForUser(tripIds: string[], userId: string): Promise<ExpenseSummary> {
    const empty: ExpenseSummary = { youPaid: 0, yourShare: 0, youReceive: 0, currency: 'INR' };
    if (tripIds.length === 0) {
      return empty;
    }

    let youPaid = 0;
    let yourShare = 0;
    let currency = 'INR';

    if (assertDbOrMock('expenses') === 'memory') {
      for (const expense of memoryExpenses.filter(
        (e) => tripIds.includes(e.tripId) && e.status !== 'REJECTED',
      )) {
        currency = expense.currency;
        if (expense.paidBy === userId) {
          youPaid += expense.amount;
        }
        const splits = memorySplits.get(expense.id) ?? [];
        const mine = splits.find((s) => s.userId === userId);
        if (mine) {
          yourShare += mine.shareCents / 100;
        } else if (expense.paidBy === userId) {
          yourShare += expense.amount;
        }
      }
      return {
        youPaid,
        yourShare,
        youReceive: Math.max(0, youPaid - yourShare),
        currency,
      };
    }

    const db = getSupabaseAdmin();
    const { data: expenses, error } = await db
      .from('expenses')
      .select('id, paid_by, amount_cents, currency, status')
      .in('trip_id', tripIds)
      .neq('status', 'rejected');

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const rows = (expenses ?? []) as {
      id: string;
      paid_by: string | null;
      amount_cents: number;
      currency: string;
      status: string;
    }[];

    if (rows.length === 0) {
      return empty;
    }

    currency = rows[0]?.currency ?? 'INR';
    for (const row of rows) {
      if (row.paid_by === userId) {
        youPaid += row.amount_cents / 100;
      }
    }

    const { data: splits, error: splitError } = await db
      .from('expense_splits')
      .select('expense_id, user_id, share_cents')
      .eq('user_id', userId)
      .in(
        'expense_id',
        rows.map((r) => r.id),
      );

    if (splitError) {
      throw new AppError(502, 'DB_ERROR', splitError.message);
    }

    for (const split of (splits ?? []) as { share_cents: number }[]) {
      yourShare += split.share_cents / 100;
    }

    return {
      youPaid,
      yourShare,
      youReceive: Math.max(0, youPaid - yourShare),
      currency,
    };
  }
}
