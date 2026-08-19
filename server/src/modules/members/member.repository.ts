import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';
import { NotificationRepository } from '../notifications/notification.repository.js';

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
  pendingSignup?: boolean;
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

interface EmailInviteRow {
  id: string;
  trip_id: string;
  email: string;
  role: MemberRole;
  created_at: string;
}

interface MemoryEmailInvite {
  id: string;
  tripId: string;
  email: string;
  role: MemberRole;
  invitedBy: string | null;
  createdAt: string;
  claimedAt: string | null;
  claimedUserId: string | null;
}

const memoryEmailInvites: MemoryEmailInvite[] = [];
const notifications = new NotificationRepository();

function mapEmailInvite(row: EmailInviteRow): TripMember {
  const local = row.email.split('@')[0] || row.email;
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: '',
    name: local,
    email: row.email,
    avatarUrl: null,
    role: row.role,
    rsvpStatus: 'pending',
    pendingSignup: true,
  };
}

function isMissingEmailInviteTable(message: string): boolean {
  return /trip_email_invites/i.test(message) && /does not exist|schema cache/i.test(message);
}

export class MemberRepository {
  async findByTrip(tripId: string): Promise<TripMember[]> {
    if (assertDbOrMock('trip members') === 'memory') {
      return this.findOpenEmailInvites(tripId);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('trip_members')
      .select(MEMBER_SELECT)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return [...((data ?? []) as unknown as MemberRow[]).map(mapRow), ...(await this.findOpenEmailInvites(tripId))];
  }

  async inviteByEmail(
    tripId: string,
    email: string,
    role: MemberRole,
    invitedBy?: string | null,
  ): Promise<TripMember> {
    if (assertDbOrMock('trip members') === 'memory') {
      const existing = memoryEmailInvites.find(
        (i) => i.tripId === tripId && i.email === email && !i.claimedAt,
      );
      if (existing) {
        existing.role = role;
        return mapEmailInvite({
          id: existing.id,
          trip_id: existing.tripId,
          email: existing.email,
          role: existing.role,
          created_at: existing.createdAt,
        });
      }
      const invite: MemoryEmailInvite = {
        id: randomUUID(),
        tripId,
        email,
        role,
        invitedBy: invitedBy ?? null,
        createdAt: new Date().toISOString(),
        claimedAt: null,
        claimedUserId: null,
      };
      memoryEmailInvites.push(invite);
      return mapEmailInvite({
        id: invite.id,
        trip_id: invite.tripId,
        email: invite.email,
        role: invite.role,
        created_at: invite.createdAt,
      });
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
    if (profile) {
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

    const { data: invite, error: inviteError } = await db
      .from('trip_email_invites')
      .upsert(
        {
          trip_id: tripId,
          email,
          role,
          invited_by: invitedBy ?? null,
          claimed_at: null,
          claimed_user_id: null,
        },
        { onConflict: 'trip_id,email' },
      )
      .select('id, trip_id, email, role, created_at')
      .single();

    if (inviteError) {
      if (isMissingEmailInviteTable(inviteError.message)) {
        throw new AppError(
          404,
          'USER_NOT_FOUND',
          `No account found for ${email}. They need to sign up first. Apply migration 017 to invite before signup.`,
        );
      }
      throw new AppError(502, 'DB_ERROR', inviteError.message);
    }

    return mapEmailInvite(invite as EmailInviteRow);
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

  async findPendingInvitesForUser(
    userId: string,
    email?: string,
  ): Promise<
    Array<{
      tripId: string;
      tripName: string;
      destination: string;
      role: MemberRole;
      rsvpStatus: RsvpStatus;
      invitedAt: string;
    }>
  > {
    if (email) {
      await this.claimEmailInvites(userId, email);
    }

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

  async claimEmailInvites(userId: string, email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    if (assertDbOrMock('trip members') === 'memory') {
      const now = new Date().toISOString();
      for (const invite of memoryEmailInvites) {
        if (invite.email === normalized && !invite.claimedAt) {
          invite.claimedAt = now;
          invite.claimedUserId = userId;
        }
      }
      return;
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('trip_email_invites')
      .select('id, trip_id, email, role')
      .eq('email', normalized)
      .is('claimed_at', null);

    if (error) {
      if (isMissingEmailInviteTable(error.message)) {
        return;
      }
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    for (const invite of (data ?? []) as { id: string; trip_id: string; role: MemberRole }[]) {
      const { error: memberError } = await db.from('trip_members').upsert(
        {
          trip_id: invite.trip_id,
          user_id: userId,
          role: invite.role,
          rsvp_status: 'pending',
        },
        { onConflict: 'trip_id,user_id' },
      );
      if (memberError) {
        console.warn('Failed to claim email invite as trip member', memberError.message);
        continue;
      }
      const { data: trip } = await db
        .from('trips')
        .select('id, name, organization_id')
        .eq('id', invite.trip_id)
        .maybeSingle();
      await notifications.createTripInvite({
        userId,
        organizationId: (trip as { organization_id?: string } | null)?.organization_id ?? null,
        tripId: invite.trip_id,
        tripName: (trip as { name?: string } | null)?.name ?? 'a trip',
        invitedByName: 'A teammate',
      });
      const { error: claimError } = await db
        .from('trip_email_invites')
        .update({
          claimed_at: new Date().toISOString(),
          claimed_user_id: userId,
        })
        .eq('id', invite.id);
      if (claimError) {
        console.warn('Failed to mark email invite claimed', claimError.message);
      }
    }
  }

  async remove(tripId: string, memberId: string): Promise<void> {
    if (assertDbOrMock('trip members') === 'memory') {
      const index = memoryEmailInvites.findIndex((i) => i.id === memberId && i.tripId === tripId);
      if (index === -1) {
        throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', `Member ${memberId} was not found`);
      }
      memoryEmailInvites.splice(index, 1);
      return;
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('trip_members')
      .delete()
      .eq('id', memberId)
      .eq('trip_id', tripId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (data) {
      return;
    }

    const { data: invite, error: inviteError } = await db
      .from('trip_email_invites')
      .delete()
      .eq('id', memberId)
      .eq('trip_id', tripId)
      .is('claimed_at', null)
      .select('id')
      .maybeSingle();

    if (inviteError) {
      if (isMissingEmailInviteTable(inviteError.message)) {
        throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', `Member ${memberId} was not found`);
      }
      throw new AppError(502, 'DB_ERROR', inviteError.message);
    }
    if (!invite) {
      throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', `Member ${memberId} was not found`);
    }
  }

  private async findOpenEmailInvites(tripId: string): Promise<TripMember[]> {
    if (assertDbOrMock('trip members') === 'memory') {
      return memoryEmailInvites
        .filter((i) => i.tripId === tripId && !i.claimedAt)
        .map((i) =>
          mapEmailInvite({
            id: i.id,
            trip_id: i.tripId,
            email: i.email,
            role: i.role,
            created_at: i.createdAt,
          }),
        );
    }

    const { data, error } = await getSupabaseAdmin()
      .from('trip_email_invites')
      .select('id, trip_id, email, role, created_at')
      .eq('trip_id', tripId)
      .is('claimed_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingEmailInviteTable(error.message)) {
        return [];
      }
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as EmailInviteRow[]).map(mapEmailInvite);
  }
}
