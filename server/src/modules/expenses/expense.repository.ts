import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

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

const STATUS_MAP: Record<ExpenseRow['status'], ExpenseStatus> = {
  draft: 'PENDING',
  submitted: 'PENDING',
  approved: 'APPROVED',
  reimbursed: 'APPROVED',
  rejected: 'REJECTED',
};

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
}

export class ExpenseRepository {
  async findByTrip(tripId: string): Promise<Expense[]> {
    if (assertDbOrMock('expenses') === 'memory') {
      return [];
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
    if (assertDbOrMock('expenses') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to add expenses');
    }

    const { data, error } = await getSupabaseAdmin()
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

    return mapRow(data as unknown as ExpenseRow);
  }

  async updateStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<Expense> {
    if (assertDbOrMock('expenses') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to update expenses');
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
}
