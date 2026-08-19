import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

export type AvailVote = 'available' | 'maybe' | 'not';
type DbAvailStatus = 'available' | 'unavailable' | 'flexible';

const AVAIL_TO_DB: Record<AvailVote, DbAvailStatus> = {
  available: 'available',
  maybe: 'flexible',
  not: 'unavailable',
};

export interface AvailabilityOption {
  id: string;
  tripId: string;
  startDate: string;
  endDate: string;
  availableCount: number;
  maybeCount: number;
  notAvailableCount: number;
  totalVotes: number;
  isSelected: boolean;
}

export interface DestinationOption {
  id: string;
  tripId: string;
  destinationName: string;
  city: string;
  country: string;
  description: string;
  estimatedCost: number;
  voteCount: number;
  imageUrl?: string;
  isSelected: boolean;
}

export interface MyVotes {
  availability: Record<string, AvailVote>;
  destinationId: string | null;
}

export interface CreateDestinationInput {
  tripId: string;
  destinationName: string;
  city: string;
  country: string;
  description: string;
  estimatedCostCents: number;
  imageUrl: string | null;
}

export interface CreateAvailabilityOptionInput {
  tripId: string;
  startDate: string;
  endDate: string;
  label?: string | null;
  createdBy: string | null;
}

interface AvailabilityRow {
  start_date: string;
  end_date: string;
  status: DbAvailStatus;
}

interface AvailabilityOptionRow {
  start_date: string;
  end_date: string;
  is_selected?: boolean | null;
}

interface DestinationRow {
  id: string;
  trip_id: string;
  name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  description: string | null;
  estimated_cost_cents: number | null;
  currency: string;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
  is_selected?: boolean | null;
}

function emptyAvailabilityOption(
  tripId: string,
  startDate: string,
  endDate: string,
): AvailabilityOption {
  return {
    id: `${startDate}_${endDate}`,
    tripId,
    startDate,
    endDate,
    availableCount: 0,
    maybeCount: 0,
    notAvailableCount: 0,
    totalVotes: 0,
    isSelected: false,
  };
}

function aggregateAvailability(
  tripId: string,
  voteRows: AvailabilityRow[],
  optionRows: AvailabilityOptionRow[],
): AvailabilityOption[] {
  const byRange = new Map<string, AvailabilityOption>();

  for (const row of optionRows) {
    const key = `${row.start_date}_${row.end_date}`;
    if (!byRange.has(key)) {
      byRange.set(key, emptyAvailabilityOption(tripId, row.start_date, row.end_date));
    }
    if (row.is_selected) {
      byRange.get(key)!.isSelected = true;
    }
  }

  for (const row of voteRows) {
    const key = `${row.start_date}_${row.end_date}`;
    let option = byRange.get(key);
    if (!option) {
      option = emptyAvailabilityOption(tripId, row.start_date, row.end_date);
      byRange.set(key, option);
    }
    if (row.status === 'available') option.availableCount += 1;
    else if (row.status === 'flexible') option.maybeCount += 1;
    else option.notAvailableCount += 1;
    option.totalVotes += 1;
  }

  return [...byRange.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function mapDestination(row: DestinationRow, voteCount: number): DestinationOption {
  const metaImage =
    typeof row.metadata?.['imageUrl'] === 'string' ? (row.metadata['imageUrl'] as string) : undefined;
  return {
    id: row.id,
    tripId: row.trip_id,
    destinationName: row.name,
    city: row.city || row.region || '',
    country: row.country ?? '',
    description: row.description ?? '',
    estimatedCost: (row.estimated_cost_cents ?? 0) / 100,
    voteCount,
    imageUrl: row.image_url || metaImage || undefined,
    isSelected: Boolean(row.is_selected),
  };
}

const DESTINATION_SELECT =
  'id, trip_id, name, city, region, country, description, estimated_cost_cents, currency, image_url, metadata, is_selected';

export class PlanningRepository {
  async findAvailabilityByTrip(tripId: string): Promise<AvailabilityOption[]> {
    if (assertDbOrMock('availability') === 'memory') {
      return [];
    }

    const db = getSupabaseAdmin();
    const [{ data: votes, error: voteError }, { data: options, error: optError }] = await Promise.all([
      db.from('availability').select('start_date, end_date, status').eq('trip_id', tripId),
      db.from('availability_options').select('start_date, end_date, is_selected').eq('trip_id', tripId),
    ]);

    if (voteError) throw new AppError(502, 'DB_ERROR', voteError.message);
    // Table may not exist until migration 011 is applied — fall back to vote-only.
    const optionRows = optError ? [] : ((options ?? []) as AvailabilityOptionRow[]);

    return aggregateAvailability(tripId, (votes ?? []) as AvailabilityRow[], optionRows);
  }

  async createAvailabilityOption(input: CreateAvailabilityOptionInput): Promise<AvailabilityOption> {
    if (assertDbOrMock('availability') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to add availability options');
    }

    const { error } = await getSupabaseAdmin()
      .from('availability_options')
      .upsert(
        {
          trip_id: input.tripId,
          start_date: input.startDate,
          end_date: input.endDate,
          label: input.label ?? null,
          created_by: input.createdBy,
        },
        { onConflict: 'trip_id,start_date,end_date' },
      );

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const all = await this.findAvailabilityByTrip(input.tripId);
    const created = all.find((o) => o.startDate === input.startDate && o.endDate === input.endDate);
    return created ?? emptyAvailabilityOption(input.tripId, input.startDate, input.endDate);
  }

  async findDestinationsByTrip(tripId: string): Promise<DestinationOption[]> {
    if (assertDbOrMock('destinations') === 'memory') {
      return [];
    }

    const db = getSupabaseAdmin();

    let destinations: DestinationRow[] | null = null;
    let destError: { message: string } | null = null;

    const primary = await db.from('destinations').select(DESTINATION_SELECT).eq('trip_id', tripId);
    if (primary.error) {
      // Pre-migration 011: columns image_url / city may be missing.
      const legacy = await db
        .from('destinations')
        .select('id, trip_id, name, region, country, description, estimated_cost_cents, currency, metadata')
        .eq('trip_id', tripId);
      destError = legacy.error;
      destinations = ((legacy.data ?? []) as Omit<DestinationRow, 'city' | 'image_url'>[]).map((row) => ({
        ...row,
        city: row.region,
        image_url: null,
      }));
    } else {
      destinations = (primary.data ?? []) as DestinationRow[];
    }

    const { data: votes, error: voteError } = await db
      .from('destination_votes')
      .select('destination_id')
      .eq('trip_id', tripId);

    if (destError) throw new AppError(502, 'DB_ERROR', destError.message);
    if (voteError) throw new AppError(502, 'DB_ERROR', voteError.message);

    const counts = new Map<string, number>();
    for (const v of (votes ?? []) as { destination_id: string }[]) {
      counts.set(v.destination_id, (counts.get(v.destination_id) ?? 0) + 1);
    }

    return (destinations ?? [])
      .map((row) => mapDestination(row, counts.get(row.id) ?? 0))
      .sort((a, b) => b.voteCount - a.voteCount);
  }

  async createDestination(input: CreateDestinationInput): Promise<DestinationOption> {
    if (assertDbOrMock('destinations') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to add destinations');
    }

    const metadata = input.imageUrl ? { imageUrl: input.imageUrl } : {};
    const baseRow = {
      trip_id: input.tripId,
      name: input.destinationName,
      region: input.city || null,
      country: input.country || null,
      description: input.description || null,
      estimated_cost_cents: input.estimatedCostCents,
      currency: 'INR',
      metadata,
    };

    let data: DestinationRow | null = null;
    let error: { message: string } | null = null;

    const withNewCols = await getSupabaseAdmin()
      .from('destinations')
      .insert({
        ...baseRow,
        city: input.city || null,
        image_url: input.imageUrl,
      })
      .select(DESTINATION_SELECT)
      .single();

    if (withNewCols.error) {
      const legacy = await getSupabaseAdmin()
        .from('destinations')
        .insert(baseRow)
        .select('id, trip_id, name, region, country, description, estimated_cost_cents, currency, metadata')
        .single();
      error = legacy.error;
      if (legacy.data) {
        const row = legacy.data as Omit<DestinationRow, 'city' | 'image_url'>;
        data = { ...row, city: row.region, image_url: input.imageUrl };
      }
    } else {
      data = withNewCols.data as DestinationRow;
    }

    if (error || !data) {
      throw new AppError(502, 'DB_ERROR', error?.message ?? 'Failed to create destination');
    }

    return mapDestination(data, 0);
  }

  async findMyVotes(tripId: string, userId: string): Promise<MyVotes> {
    if (assertDbOrMock('votes') === 'memory') {
      return { availability: {}, destinationId: null };
    }

    const db = getSupabaseAdmin();

    const [{ data: availRows, error: availError }, { data: destRow, error: destError }] = await Promise.all([
      db
        .from('availability')
        .select('start_date, end_date, status')
        .eq('trip_id', tripId)
        .eq('user_id', userId),
      db
        .from('destination_votes')
        .select('destination_id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (availError) throw new AppError(502, 'DB_ERROR', availError.message);
    if (destError) throw new AppError(502, 'DB_ERROR', destError.message);

    const DB_TO_AVAIL: Record<DbAvailStatus, AvailVote> = {
      available: 'available',
      flexible: 'maybe',
      unavailable: 'not',
    };

    const availability: Record<string, AvailVote> = {};
    for (const row of (availRows ?? []) as AvailabilityRow[]) {
      availability[`${row.start_date}_${row.end_date}`] = DB_TO_AVAIL[row.status];
    }

    return { availability, destinationId: (destRow as { destination_id: string } | null)?.destination_id ?? null };
  }

  async castAvailabilityVote(
    tripId: string,
    userId: string,
    startDate: string,
    endDate: string,
    vote: AvailVote,
  ): Promise<void> {
    if (assertDbOrMock('votes') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to cast votes');
    }

    const { error } = await getSupabaseAdmin()
      .from('availability')
      .upsert(
        {
          trip_id: tripId,
          user_id: userId,
          start_date: startDate,
          end_date: endDate,
          status: AVAIL_TO_DB[vote],
        },
        { onConflict: 'trip_id,user_id,start_date,end_date' },
      );

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
  }

  async castDestinationVote(tripId: string, userId: string, destinationId: string): Promise<void> {
    if (assertDbOrMock('votes') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to cast votes');
    }

    const { error } = await getSupabaseAdmin()
      .from('destination_votes')
      .upsert(
        { trip_id: tripId, user_id: userId, destination_id: destinationId },
        { onConflict: 'trip_id,user_id' },
      );

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
  }

  async selectDestination(tripId: string, destinationId: string): Promise<DestinationOption> {
    if (assertDbOrMock('destinations') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to lock a destination');
    }

    const db = getSupabaseAdmin();
    const { error: clearError } = await db
      .from('destinations')
      .update({ is_selected: false })
      .eq('trip_id', tripId);
    if (clearError) {
      throw new AppError(502, 'DB_ERROR', clearError.message);
    }

    const { data, error } = await db
      .from('destinations')
      .update({ is_selected: true })
      .eq('trip_id', tripId)
      .eq('id', destinationId)
      .select(DESTINATION_SELECT)
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'DESTINATION_NOT_FOUND', `Destination ${destinationId} was not found`);
    }

    const destinations = await this.findDestinationsByTrip(tripId);
    const selected = destinations.find((d) => d.id === destinationId);
    return selected ?? mapDestination(data as DestinationRow, 0);
  }

  async selectAvailabilityOption(
    tripId: string,
    startDate: string,
    endDate: string,
    createdBy: string | null,
  ): Promise<AvailabilityOption> {
    if (assertDbOrMock('availability') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to lock trip dates');
    }

    const db = getSupabaseAdmin();
    const { error: clearError } = await db
      .from('availability_options')
      .update({ is_selected: false })
      .eq('trip_id', tripId);
    if (clearError) {
      throw new AppError(
        502,
        'DB_ERROR',
        /is_selected|does not exist|schema cache/i.test(clearError.message)
          ? 'Apply migration 017_pending_workflows.sql to lock poll dates'
          : clearError.message,
      );
    }

    const { error } = await db.from('availability_options').upsert(
      {
        trip_id: tripId,
        start_date: startDate,
        end_date: endDate,
        is_selected: true,
        created_by: createdBy,
      },
      { onConflict: 'trip_id,start_date,end_date' },
    );

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const all = await this.findAvailabilityByTrip(tripId);
    const selected = all.find((o) => o.startDate === startDate && o.endDate === endDate);
    return selected ?? { ...emptyAvailabilityOption(tripId, startDate, endDate), isSelected: true };
  }
}
