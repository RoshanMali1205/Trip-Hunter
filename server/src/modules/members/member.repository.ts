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

const MEMBER_SELECT = 'id, trip_id, user_id, role, rsvp_status, profiles(display_name, email, avatar_url)';

export class MemberRepository {
  async findByTrip(tripId: string): Promise<TripMember[]> {
    if (assertDbOrMock('trip members') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('trip_members')
      .select(MEMBER_SELECT)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as MemberRow[]).map(mapRow);
  }

  async inviteByEmail(tripId: string, email: string, role: MemberRole): Promise<TripMember> {
    if (assertDbOrMock('trip members') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to invite members');
    }

    const db = getSupabaseAdmin();

    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      throw new AppError(502, 'DB_ERROR', profileError.message);
    }
    if (!profile) {
      throw new AppError(
        404,
        'USER_NOT_FOUND',
        `No account found for ${email}. They need to sign up first.`,
      );
    }

    const { data, error } = await db
      .from('trip_members')
      .upsert(
        { trip_id: tripId, user_id: (profile as { id: string }).id, role, rsvp_status: 'pending' },
        { onConflict: 'trip_id,user_id' },
      )
      .select(MEMBER_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return mapRow(data as unknown as MemberRow);
  }

  async respondToInvite(tripId: string, userId: string, rsvpStatus: RsvpStatus): Promise<TripMember> {
    if (assertDbOrMock('trip members') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to respond to invites');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('trip_members')
      .update({ rsvp_status: rsvpStatus })
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .select(MEMBER_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', 'You are not a member of this trip');
    }

    return mapRow(data as unknown as MemberRow);
  }

  async findPendingInvitesForUser(userId: string): Promise<
    Array<{
      tripId: string;
      tripName: string;
      destination: string;
      role: MemberRole;
      rsvpStatus: RsvpStatus;
      invitedAt: string;
    }>
  > {
    if (assertDbOrMock('trip members') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('trip_members')
      .select(
        'role, rsvp_status, created_at, trips(id, name, destination_summary)',
      )
      .eq('user_id', userId)
      .in('rsvp_status', ['pending', 'maybe'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as Array<{
      role: MemberRole;
      rsvp_status: RsvpStatus;
      created_at: string;
      trips:
        | { id: string; name: string; destination_summary: string | null }
        | { id: string; name: string; destination_summary: string | null }[]
        | null;
    }>).flatMap((row) => {
      const trip = Array.isArray(row.trips) ? row.trips[0] : row.trips;
      if (!trip) return [];
      return [
        {
          tripId: trip.id,
          tripName: trip.name,
          destination: trip.destination_summary ?? '',
          role: row.role,
          rsvpStatus: row.rsvp_status,
          invitedAt: row.created_at,
        },
      ];
    });
  }

  async remove(tripId: string, memberId: string): Promise<void> {
    if (assertDbOrMock('trip members') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to remove members');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('trip_members')
      .delete()
      .eq('id', memberId)
      .eq('trip_id', tripId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', `Member ${memberId} was not found`);
    }
  }
}
