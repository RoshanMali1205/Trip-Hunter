import { randomUUID } from 'node:crypto';
import { allowMockData } from '../../config/env.js';
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
} from '../../config/supabase.js';
import { AppError } from '../../middleware/error-handler.js';

export type TripStatus =
  | 'draft'
  | 'planning'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Trip {
  id: string;
  organizationId: string;
  teamId: string | null;
  name: string;
  description: string;
  destination: string;
  status: TripStatus;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number;
  actualCents: number;
  currency: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripInput {
  organizationId: string;
  name: string;
  description: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  currency: string;
  budgetCents: number;
  createdBy: string | null;
}

interface TripRow {
  id: string;
  organization_id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  destination_summary: string | null;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  currency: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  budgets?: { total_cents: number | null }[] | null;
}

const now = '2026-08-01T10:00:00.000Z';

/** In-memory seed: Acme eng team outing to Goa (used when Supabase is not configured). */
const memoryTrips: Trip[] = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    organizationId: '22222222-2222-2222-2222-222222222222',
    teamId: '44444444-4444-4444-4444-444444444444',
    name: 'Goa Team Outing 2026',
    description:
      'Annual engineering offsite — beaches, team bonding, and a light planning day in North Goa.',
    destination: 'Goa, India',
    status: 'planning',
    startDate: '2026-11-14',
    endDate: '2026-11-17',
    budgetCents: 45000000,
    actualCents: 0,
    currency: 'INR',
    createdBy: '11111111-1111-1111-1111-111111111111',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    organizationId: '22222222-2222-2222-2222-222222222222',
    teamId: '44444444-4444-4444-4444-444444444444',
    name: 'Goa Reunion Weekend',
    description:
      'Follow-up long weekend for remote teammates who missed the main outing.',
    destination: 'Goa, India',
    status: 'draft',
    startDate: '2027-01-09',
    endDate: '2027-01-11',
    budgetCents: 18000000,
    actualCents: 0,
    currency: 'INR',
    createdBy: '11111111-1111-1111-1111-111111111111',
    createdAt: now,
    updatedAt: now,
  },
];

function mapRow(row: TripRow): Trip {
  const budgetCents = Array.isArray(row.budgets)
    ? Number(row.budgets[0]?.total_cents ?? 0)
    : 0;

  return {
    id: row.id,
    organizationId: row.organization_id,
    teamId: row.team_id,
    name: row.name,
    description: row.description ?? '',
    destination: row.destination_summary ?? '',
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    budgetCents,
    actualCents: 0,
    currency: row.currency,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Sums each trip's non-rejected expenses and fills in `actualCents`. */
async function attachActualSpend(
  db: ReturnType<typeof getSupabaseAdmin>,
  trips: Trip[],
): Promise<Trip[]> {
  if (trips.length === 0) {
    return trips;
  }

  const { data, error } = await db
    .from('expenses')
    .select('trip_id, amount_cents')
    .in(
      'trip_id',
      trips.map((t) => t.id),
    )
    .neq('status', 'rejected');

  if (error) {
    throw new AppError(502, 'DB_ERROR', error.message);
  }

  const sums = new Map<string, number>();
  for (const row of (data ?? []) as { trip_id: string; amount_cents: number }[]) {
    sums.set(row.trip_id, (sums.get(row.trip_id) ?? 0) + row.amount_cents);
  }

  return trips.map((t) => ({ ...t, actualCents: sums.get(t.id) ?? 0 }));
}

const TRIP_SELECT =
  'id, organization_id, team_id, name, description, destination_summary, status, start_date, end_date, currency, created_by, created_at, updated_at, budgets(total_cents)';

function assertDbOrMock(): 'supabase' | 'memory' {
  if (isSupabaseAdminConfigured()) {
    return 'supabase';
  }
  if (allowMockData()) {
    return 'memory';
  }
  throw new AppError(
    503,
    'SUPABASE_NOT_CONFIGURED',
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to query trips',
  );
}

export class TripRepository {
  async findAll(): Promise<Trip[]> {
    if (assertDbOrMock() === 'memory') {
      return [...memoryTrips];
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('trips')
      .select(TRIP_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return attachActualSpend(db, ((data ?? []) as TripRow[]).map(mapRow));
  }

  async findById(id: string): Promise<Trip | undefined> {
    if (assertDbOrMock() === 'memory') {
      return memoryTrips.find((t) => t.id === id);
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('trips')
      .select(TRIP_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      return undefined;
    }

    const [trip] = await attachActualSpend(db, [mapRow(data as TripRow)]);
    return trip;
  }

  async findByOrganization(organizationId: string): Promise<Trip[]> {
    if (assertDbOrMock() === 'memory') {
      return memoryTrips.filter((t) => t.organizationId === organizationId);
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('trips')
      .select(TRIP_SELECT)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return attachActualSpend(db, ((data ?? []) as TripRow[]).map(mapRow));
  }

  async create(input: CreateTripInput): Promise<Trip> {
    if (assertDbOrMock() === 'memory') {
      const trip: Trip = {
        id: randomUUID(),
        organizationId: input.organizationId,
        teamId: null,
        name: input.name,
        description: input.description,
        destination: input.destination,
        status: 'draft',
        startDate: input.startDate,
        endDate: input.endDate,
        budgetCents: input.budgetCents,
        actualCents: 0,
        currency: input.currency,
        createdBy: input.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryTrips.unshift(trip);
      return trip;
    }

    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('trips')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        description: input.description || null,
        destination_summary: input.destination || null,
        start_date: input.startDate,
        end_date: input.endDate,
        currency: input.currency,
        created_by: input.createdBy,
      })
      .select(
        'id, organization_id, team_id, name, description, destination_summary, status, start_date, end_date, currency, created_by, created_at, updated_at',
      )
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const row = data as TripRow;
    let budgetCents = 0;

    if (input.budgetCents > 0) {
      const { data: budgetRow, error: budgetError } = await db
        .from('budgets')
        .insert({
          trip_id: row.id,
          total_cents: input.budgetCents,
          currency: input.currency,
        })
        .select('total_cents')
        .single();

      if (budgetError) {
        throw new AppError(502, 'DB_ERROR', budgetError.message);
      }
      budgetCents = Number(budgetRow?.total_cents ?? 0);
    }

    return mapRow({ ...row, budgets: [{ total_cents: budgetCents }] });
  }

  async delete(id: string): Promise<void> {
    if (assertDbOrMock() === 'memory') {
      const index = memoryTrips.findIndex((t) => t.id === id);
      if (index !== -1) memoryTrips.splice(index, 1);
      return;
    }

    const { error } = await getSupabaseAdmin().from('trips').delete().eq('id', id);

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
  }
}
