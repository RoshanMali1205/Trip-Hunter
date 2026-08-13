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
  currency: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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
    currency: row.currency,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

    const { data, error } = await getSupabaseAdmin()
      .from('trips')
      .select(TRIP_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as TripRow[]).map(mapRow);
  }

  async findById(id: string): Promise<Trip | undefined> {
    if (assertDbOrMock() === 'memory') {
      return memoryTrips.find((t) => t.id === id);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('trips')
      .select(TRIP_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return data ? mapRow(data as TripRow) : undefined;
  }

  async findByOrganization(organizationId: string): Promise<Trip[]> {
    if (assertDbOrMock() === 'memory') {
      return memoryTrips.filter((t) => t.organizationId === organizationId);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('trips')
      .select(TRIP_SELECT)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as TripRow[]).map(mapRow);
  }
}
