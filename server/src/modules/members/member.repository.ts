import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

export type MemberRole = 'organizer' | 'traveler' | 'viewer';
export type RsvpStatus = 'pending' | 'accepted' | 'declined' | 'maybe';

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: MemberRole;
  rsvpStatus: RsvpStatus;
}

interface MemberRow {
  id: string;
  trip_id: string;
  user_id: string;
  role: MemberRole;
  rsvp_status: RsvpStatus;
  profiles: { display_name: string; email: string; avatar_url: string | null } | null;
}

function mapRow(row: MemberRow): TripMember {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    name: row.profiles?.display_name ?? 'Unknown',
    email: row.profiles?.email ?? '',
    avatarUrl: row.profiles?.avatar_url ?? null,
    role: row.role,
    rsvpStatus: row.rsvp_status,
  };
}

export class MemberRepository {
  async findByTrip(tripId: string): Promise<TripMember[]> {
    if (assertDbOrMock('trip members') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('trip_members')
      .select('id, trip_id, user_id, role, rsvp_status, profiles(display_name, email, avatar_url)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as MemberRow[]).map(mapRow);
  }
}
