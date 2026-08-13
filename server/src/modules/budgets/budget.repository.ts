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

export class BudgetRepository {
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

    return ((categories ?? []) as BudgetCategoryRow[]).map((row) => ({
      id: row.id,
      tripId,
      category: row.name,
      plannedAmount: row.allocated_cents / 100,
      actualAmount: row.spent_cents / 100,
      currency: row.currency,
    }));
  }
}
