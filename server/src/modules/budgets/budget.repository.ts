import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

export interface BudgetCategory {
  id: string;
  tripId: string;
  category: string;
  plannedAmount: number;
  actualAmount: number;
  currency: string;
}

interface BudgetRow {
  id: string;
  currency: string;
}

interface BudgetCategoryRow {
  id: string;
  budget_id: string;
  name: string;
  allocated_cents: number;
  spent_cents: number;
  currency: string;
}

function mapCategory(row: BudgetCategoryRow, tripId: string): BudgetCategory {
  return {
    id: row.id,
    tripId,
    category: row.name,
    plannedAmount: row.allocated_cents / 100,
    actualAmount: row.spent_cents / 100,
    currency: row.currency,
  };
}

export class BudgetRepository {
  /** Finds the trip's primary budget, creating an empty one if it doesn't exist yet. */
  private async ensureBudget(tripId: string, currency: string): Promise<string> {
    const db = getSupabaseAdmin();

    const { data: existing, error: findError } = await db
      .from('budgets')
      .select('id')
      .eq('trip_id', tripId)
      .maybeSingle();

    if (findError) {
      throw new AppError(502, 'DB_ERROR', findError.message);
    }
    if (existing) {
      return (existing as { id: string }).id;
    }

    const { data: created, error: createError } = await db
      .from('budgets')
      .insert({ trip_id: tripId, name: 'Primary budget', total_cents: 0, currency })
      .select('id')
      .single();

    if (createError) {
      throw new AppError(502, 'DB_ERROR', createError.message);
    }

    return (created as { id: string }).id;
  }

  async findCategoriesByTrip(tripId: string): Promise<BudgetCategory[]> {
    if (assertDbOrMock('budget') === 'memory') {
      return [];
    }

    const db = getSupabaseAdmin();

    const { data: budgets, error: budgetsError } = await db
      .from('budgets')
      .select('id, currency')
      .eq('trip_id', tripId);

    if (budgetsError) {
      throw new AppError(502, 'DB_ERROR', budgetsError.message);
    }

    const budgetRows = (budgets ?? []) as BudgetRow[];
    if (budgetRows.length === 0) {
      return [];
    }

    const { data: categories, error: categoriesError } = await db
      .from('budget_categories')
      .select('id, budget_id, name, allocated_cents, spent_cents, currency')
      .in(
        'budget_id',
        budgetRows.map((b) => b.id),
      );

    if (categoriesError) {
      throw new AppError(502, 'DB_ERROR', categoriesError.message);
    }

    return ((categories ?? []) as BudgetCategoryRow[]).map((row) => mapCategory(row, tripId));
  }

  async createCategory(
    tripId: string,
    name: string,
    allocatedCents: number,
    currency: string,
  ): Promise<BudgetCategory> {
    if (assertDbOrMock('budget') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to edit the budget');
    }

    const budgetId = await this.ensureBudget(tripId, currency);
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('budget_categories')
      .insert({ budget_id: budgetId, name, allocated_cents: allocatedCents, currency })
      .select('id, budget_id, name, allocated_cents, spent_cents, currency')
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return mapCategory(data as BudgetCategoryRow, tripId);
  }

  async updateCategory(
    tripId: string,
    categoryId: string,
    updates: { allocatedCents?: number; spentCents?: number },
  ): Promise<BudgetCategory> {
    if (assertDbOrMock('budget') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to edit the budget');
    }

    const db = getSupabaseAdmin();

    const patch: Record<string, number> = {};
    if (updates.allocatedCents !== undefined) patch['allocated_cents'] = updates.allocatedCents;
    if (updates.spentCents !== undefined) patch['spent_cents'] = updates.spentCents;

    const { data, error } = await db
      .from('budget_categories')
      .update(patch)
      .eq('id', categoryId)
      .select('id, budget_id, name, allocated_cents, spent_cents, currency, budgets!inner(trip_id)')
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', `Budget category ${categoryId} was not found`);
    }

    const row = data as unknown as BudgetCategoryRow & { budgets: { trip_id: string }[] };
    if (row.budgets[0]?.trip_id !== tripId) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', `Budget category ${categoryId} was not found`);
    }

    return mapCategory(row, tripId);
  }
}
