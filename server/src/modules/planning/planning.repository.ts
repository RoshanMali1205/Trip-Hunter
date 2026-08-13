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
}

export interface DestinationOption {
  id: string;
  tripId: string;
  destinationName: string;
  country: string;
  description: string;
  estimatedCost: number;
  voteCount: number;
  imageUrl?: string;
}

export interface MyVotes {
  availability: Record<string, AvailVote>;
  destinationId: string | null;
}

interface AvailabilityRow {
  start_date: string;
  end_date: string;
  status: DbAvailStatus;
}

interface DestinationRow {
  id: string;
  trip_id: string;
  name: string;
  country: string | null;
  description: string | null;
  estimated_cost_cents: number | null;
  currency: string;
  metadata: Record<string, unknown> | null;
}

function aggregateAvailability(tripId: string, rows: AvailabilityRow[]): AvailabilityOption[] {
  const byRange = new Map<string, AvailabilityOption>();

  for (const row of rows) {
    const key = `${row.start_date}_${row.end_date}`;
    let option = byRange.get(key);
    if (!option) {
      option = {
        id: key,
        tripId,
        startDate: row.start_date,
        endDate: row.end_date,
        availableCount: 0,
        maybeCount: 0,
        notAvailableCount: 0,
        totalVotes: 0,
      };
      byRange.set(key, option);
    }
    if (row.status === 'available') option.availableCount += 1;
    else if (row.status === 'flexible') option.maybeCount += 1;
    else option.notAvailableCount += 1;
    option.totalVotes += 1;
  }

  return [...byRange.values()];
}

function mapDestination(row: DestinationRow, voteCount: number): DestinationOption {
  return {
    id: row.id,
    tripId: row.trip_id,
    destinationName: row.name,
    country: row.country ?? '',
    description: row.description ?? '',
    estimatedCost: (row.estimated_cost_cents ?? 0) / 100,
    voteCount,
    imageUrl: typeof row.metadata?.['imageUrl'] === 'string' ? (row.metadata['imageUrl'] as string) : undefined,
  };
}

export class PlanningRepository {
  async findAvailabilityByTrip(tripId: string): Promise<AvailabilityOption[]> {
    if (assertDbOrMock('availability') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('availability')
      .select('start_date, end_date, status')
      .eq('trip_id', tripId);

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return aggregateAvailability(tripId, (data ?? []) as AvailabilityRow[]);
  }

  async findDestinationsByTrip(tripId: string): Promise<DestinationOption[]> {
    if (assertDbOrMock('destinations') === 'memory') {
      return [];
    }

    const db = getSupabaseAdmin();

    const [{ data: destinations, error: destError }, { data: votes, error: voteError }] = await Promise.all([
      db
        .from('destinations')
        .select('id, trip_id, name, country, description, estimated_cost_cents, currency, metadata')
        .eq('trip_id', tripId),
      db.from('destination_votes').select('destination_id').eq('trip_id', tripId),
    ]);

    if (destError) throw new AppError(502, 'DB_ERROR', destError.message);
    if (voteError) throw new AppError(502, 'DB_ERROR', voteError.message);

    const counts = new Map<string, number>();
    for (const v of (votes ?? []) as { destination_id: string }[]) {
      counts.set(v.destination_id, (counts.get(v.destination_id) ?? 0) + 1);
    }

    return ((destinations ?? []) as DestinationRow[])
      .map((row) => mapDestination(row, counts.get(row.id) ?? 0))
      .sort((a, b) => b.voteCount - a.voteCount);
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
}
