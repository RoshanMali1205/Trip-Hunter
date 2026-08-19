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

export type TripType =
  | 'business'
  | 'team_outing'
  | 'corporate_offsite'
  | 'training_conference'
  | 'project_visit'
  | 'personal_group';

export type TripApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export interface Trip {
  id: string;
  organizationId: string;
  teamId: string | null;
  name: string;
  description: string;
  destination: string;
  origin: string;
  tripType: TripType;
  status: TripStatus;
  approvalStatus: TripApprovalStatus;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number;
  actualCents: number;
  currency: string;
  maxMembers: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripInput {
  organizationId: string;
  name: string;
  description: string;
  destination: string;
  origin?: string;
  tripType?: TripType;
  startDate: string | null;
  endDate: string | null;
  currency: string;
  budgetCents: number;
  maxMembers?: number | null;
  approvalStatus?: TripApprovalStatus;
  teamId?: string | null;
  createdBy: string | null;
}

export interface UpdateTripInput {
  name?: string;
  description?: string;
  destination?: string;
  origin?: string;
  tripType?: TripType;
  status?: TripStatus;
  approvalStatus?: TripApprovalStatus;
  startDate?: string | null;
  endDate?: string | null;
  currency?: string;
  budgetCents?: number;
  maxMembers?: number | null;
  teamId?: string | null;
}

interface TripRow {
  id: string;
  organization_id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  destination_summary: string | null;
  origin: string | null;
  trip_type: TripType | null;
  status: TripStatus;
  approval_status: TripApprovalStatus | null;
  start_date: string | null;
  end_date: string | null;
  currency: string;
  max_members: number | null;
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
    origin: 'Bengaluru',
    tripType: 'team_outing',
    status: 'planning',
    approvalStatus: 'approved',
    startDate: '2026-11-14',
    endDate: '2026-11-17',
    budgetCents: 45000000,
    actualCents: 0,
    currency: 'INR',
    maxMembers: 12,
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
    origin: 'Bengaluru',
    tripType: 'team_outing',
    status: 'draft',
    approvalStatus: 'not_required',
    startDate: '2027-01-09',
    endDate: '2027-01-11',
    budgetCents: 18000000,
    actualCents: 0,
    currency: 'INR',
    maxMembers: 8,
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
    origin: row.origin ?? '',
    tripType: row.trip_type ?? 'team_outing',
    status: row.status,
    approvalStatus: row.approval_status ?? 'not_required',
    startDate: row.start_date,
    endDate: row.end_date,
    budgetCents,
    actualCents: 0,
    currency: row.currency,
    maxMembers: row.max_members,
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

const TRIP_META_COLUMNS = ['origin', 'trip_type', 'approval_status', 'max_members'] as const;

const TRIP_SELECT =
  'id, organization_id, team_id, name, description, destination_summary, origin, trip_type, status, approval_status, start_date, end_date, currency, max_members, created_by, created_at, updated_at, budgets(total_cents)';

const TRIP_SELECT_CORE =
  'id, organization_id, team_id, name, description, destination_summary, status, start_date, end_date, currency, created_by, created_at, updated_at, budgets(total_cents)';

const TRIP_INSERT_SELECT =
  'id, organization_id, team_id, name, description, destination_summary, origin, trip_type, status, approval_status, start_date, end_date, currency, max_members, created_by, created_at, updated_at';

const TRIP_INSERT_SELECT_CORE =
  'id, organization_id, team_id, name, description, destination_summary, status, start_date, end_date, currency, created_by, created_at, updated_at';

function isMissingTripMetaColumn(message: string): boolean {
  const lower = message.toLowerCase();
  const mentionsMissing =
    lower.includes('schema cache') ||
    lower.includes('could not find') ||
    lower.includes('does not exist');
  if (!mentionsMissing) {
    return false;
  }
  return TRIP_META_COLUMNS.some((col) => lower.includes(col));
}

function tripDbError(message: string): AppError {
  if (isMissingTripMetaColumn(message)) {
    return new AppError(
      502,
      'DB_SCHEMA',
      `${message} Apply supabase/migrations/012_trip_meta_fields.sql in the Supabase SQL editor, then run: NOTIFY pgrst, 'reload schema';`,
    );
  }
  return new AppError(502, 'DB_ERROR', message);
}

async function queryTrips<T>(
  run: (
    select: string,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T> {
  const full = await run(TRIP_SELECT);
  if (!full.error) {
    return full.data as T;
  }
  if (isMissingTripMetaColumn(full.error.message)) {
    console.warn(
      'trips meta columns missing from schema cache; using core columns',
      full.error.message,
    );
    const core = await run(TRIP_SELECT_CORE);
    if (core.error) {
      throw tripDbError(core.error.message);
    }
    return core.data as T;
  }
  throw tripDbError(full.error.message);
}

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
    const data = await queryTrips<TripRow[]>((select) =>
      db.from('trips').select(select).order('created_at', { ascending: false }),
    );

    return attachActualSpend(db, (data ?? []).map(mapRow));
  }

  async findById(id: string): Promise<Trip | undefined> {
    if (assertDbOrMock() === 'memory') {
      return memoryTrips.find((t) => t.id === id);
    }

    const db = getSupabaseAdmin();
    const data = await queryTrips<TripRow | null>((select) =>
      db.from('trips').select(select).eq('id', id).maybeSingle(),
    );
    if (!data) {
      return undefined;
    }

    const [trip] = await attachActualSpend(db, [mapRow(data)]);
    return trip;
  }

  async findByOrganization(organizationId: string): Promise<Trip[]> {
    if (assertDbOrMock() === 'memory') {
      return memoryTrips.filter((t) => t.organizationId === organizationId);
    }

    const db = getSupabaseAdmin();
    const data = await queryTrips<TripRow[]>((select) =>
      db
        .from('trips')
        .select(select)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
    );

    return attachActualSpend(db, (data ?? []).map(mapRow));
  }

  /** Org trips plus any trip the user was invited to / joined as a member. */
  async findVisibleToUser(userId: string, organizationId?: string): Promise<Trip[]> {
    if (assertDbOrMock() === 'memory') {
      if (organizationId) {
        return memoryTrips.filter((t) => t.organizationId === organizationId);
      }
      return [...memoryTrips];
    }

    const db = getSupabaseAdmin();
    const byId = new Map<string, TripRow>();

    if (organizationId) {
      const data = await queryTrips<TripRow[]>((select) =>
        db
          .from('trips')
          .select(select)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),
      );
      for (const row of data ?? []) byId.set(row.id, row);
    }

    const { data: memberships, error: membershipError } = await db
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', userId);

    if (membershipError) {
      throw new AppError(502, 'DB_ERROR', membershipError.message);
    }

    const memberTripIds = (memberships ?? [])
      .map((row) => String((row as { trip_id: string }).trip_id))
      .filter((id) => id && !byId.has(id));

    if (memberTripIds.length > 0) {
      const data = await queryTrips<TripRow[]>((select) =>
        db.from('trips').select(select).in('id', memberTripIds),
      );
      for (const row of data ?? []) byId.set(row.id, row);
    }

    const trips = [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return attachActualSpend(db, trips.map(mapRow));
  }

  async create(input: CreateTripInput): Promise<Trip> {
    if (assertDbOrMock() === 'memory') {
      const trip: Trip = {
        id: randomUUID(),
        organizationId: input.organizationId,
        teamId: input.teamId ?? null,
        name: input.name,
        description: input.description,
        destination: input.destination,
        origin: input.origin ?? '',
        tripType: input.tripType ?? 'team_outing',
        status: 'draft',
        approvalStatus: input.approvalStatus ?? 'not_required',
        startDate: input.startDate,
        endDate: input.endDate,
        budgetCents: input.budgetCents,
        actualCents: 0,
        currency: input.currency,
        maxMembers: input.maxMembers ?? null,
        createdBy: input.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryTrips.unshift(trip);
      return trip;
    }

    const db = getSupabaseAdmin();

    const coreRow = {
      organization_id: input.organizationId,
      team_id: input.teamId || null,
      name: input.name,
      description: input.description || null,
      destination_summary: input.destination || null,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      currency: input.currency,
      created_by: input.createdBy,
    };
    const metaRow = {
      origin: input.origin || null,
      trip_type: input.tripType ?? 'team_outing',
      max_members: input.maxMembers ?? null,
      approval_status: input.approvalStatus ?? 'not_required',
    };

    let { data, error } = await db
      .from('trips')
      .insert({ ...coreRow, ...metaRow })
      .select(TRIP_INSERT_SELECT)
      .single();

    if (error && isMissingTripMetaColumn(error.message)) {
      console.warn(
        'trips meta columns missing; inserting without origin/trip_type/max_members/approval_status',
        error.message,
      );
      ({ data, error } = await db
        .from('trips')
        .insert(coreRow)
        .select(TRIP_INSERT_SELECT_CORE)
        .single());
    }

    if (error) {
      throw tripDbError(error.message);
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

    if (input.createdBy) {
      const { error: memberError } = await db.from('trip_members').upsert(
        {
          trip_id: row.id,
          user_id: input.createdBy,
          role: 'organizer',
          rsvp_status: 'accepted',
        },
        { onConflict: 'trip_id,user_id' },
      );
      if (memberError) {
        console.warn('Failed to add trip creator as member', memberError.message);
      }
    }

    return mapRow({ ...row, budgets: [{ total_cents: budgetCents }] });
  }

  async update(id: string, input: UpdateTripInput): Promise<Trip> {
    if (assertDbOrMock() === 'memory') {
      const index = memoryTrips.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new AppError(404, 'TRIP_NOT_FOUND', `Trip ${id} was not found`);
      }
      const current = memoryTrips[index]!;
      const updated: Trip = {
        ...current,
        name: input.name ?? current.name,
        description: input.description ?? current.description,
        destination: input.destination ?? current.destination,
        origin: input.origin ?? current.origin,
        tripType: input.tripType ?? current.tripType,
        status: input.status ?? current.status,
        approvalStatus: input.approvalStatus ?? current.approvalStatus,
        startDate: input.startDate !== undefined ? input.startDate : current.startDate,
        endDate: input.endDate !== undefined ? input.endDate : current.endDate,
        currency: input.currency ?? current.currency,
        budgetCents: input.budgetCents ?? current.budgetCents,
        maxMembers: input.maxMembers !== undefined ? input.maxMembers : current.maxMembers,
        teamId: input.teamId !== undefined ? input.teamId : current.teamId,
        updatedAt: new Date().toISOString(),
      };
      memoryTrips[index] = updated;
      return updated;
    }

    const db = getSupabaseAdmin();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch['name'] = input.name;
    if (input.description !== undefined) patch['description'] = input.description || null;
    if (input.destination !== undefined) patch['destination_summary'] = input.destination || null;
    if (input.origin !== undefined) patch['origin'] = input.origin || null;
    if (input.tripType !== undefined) patch['trip_type'] = input.tripType;
    if (input.status !== undefined) patch['status'] = input.status;
    if (input.approvalStatus !== undefined) patch['approval_status'] = input.approvalStatus;
    if (input.startDate !== undefined) patch['start_date'] = input.startDate;
    if (input.endDate !== undefined) patch['end_date'] = input.endDate;
    if (input.currency !== undefined) patch['currency'] = input.currency;
    if (input.maxMembers !== undefined) patch['max_members'] = input.maxMembers;
    if (input.teamId !== undefined) patch['team_id'] = input.teamId;

    if (Object.keys(patch).length > 0) {
      let { error } = await db.from('trips').update(patch).eq('id', id);
      if (error && isMissingTripMetaColumn(error.message)) {
        const corePatch = { ...patch };
        for (const col of TRIP_META_COLUMNS) {
          delete corePatch[col];
        }
        if (Object.keys(corePatch).length > 0) {
          ({ error } = await db.from('trips').update(corePatch).eq('id', id));
        } else {
          error = null;
        }
      }
      if (error) {
        throw tripDbError(error.message);
      }
    }

    if (input.budgetCents !== undefined) {
      const { data: existingBudget, error: budgetLookupError } = await db
        .from('budgets')
        .select('id')
        .eq('trip_id', id)
        .maybeSingle();
      if (budgetLookupError) {
        throw new AppError(502, 'DB_ERROR', budgetLookupError.message);
      }
      if (existingBudget) {
        const { error: budgetUpdateError } = await db
          .from('budgets')
          .update({ total_cents: input.budgetCents })
          .eq('trip_id', id);
        if (budgetUpdateError) {
          throw new AppError(502, 'DB_ERROR', budgetUpdateError.message);
        }
      } else if (input.budgetCents > 0) {
        const currency = input.currency ?? (await this.findById(id))?.currency ?? 'INR';
        const { error: budgetInsertError } = await db.from('budgets').insert({
          trip_id: id,
          total_cents: input.budgetCents,
          currency,
        });
        if (budgetInsertError) {
          throw new AppError(502, 'DB_ERROR', budgetInsertError.message);
        }
      }
    }

    const trip = await this.findById(id);
    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', `Trip ${id} was not found`);
    }
    return trip;
  }

  async delete(id: string): Promise<void> {
    if (assertDbOrMock() === 'memory') {
      const index = memoryTrips.findIndex((t) => t.id === id);
      if (index !== -1) memoryTrips.splice(index, 1);
      return;
    }

    const { error } = await getSupabaseAdmin().from('trips').delete().eq('id', id);

    if (error) {
      throw tripDbError(error.message);
    }
  }
}
