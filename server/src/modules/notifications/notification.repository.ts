import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  tripId?: string | null;
  payload?: Record<string, unknown>;
}

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  trip_id: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

const NOTIFICATION_SELECT = 'id, kind, title, body, trip_id, payload, read_at, created_at';

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.body ?? '',
    type: row.kind,
    read: row.read_at !== null,
    createdAt: row.created_at,
    tripId: row.trip_id,
    payload: row.payload ?? {},
  };
}

export class NotificationRepository {
  async findByUser(userId: string): Promise<AppNotification[]> {
    if (assertDbOrMock('notifications') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('notifications')
      .select(NOTIFICATION_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as NotificationRow[]).map(mapRow);
  }

  async createTripInvite(input: {
    userId: string;
    organizationId: string | null;
    tripId: string;
    tripName: string;
    invitedByName: string;
  }): Promise<void> {
    if (assertDbOrMock('notifications') === 'memory') {
      return;
    }

    const { error } = await getSupabaseAdmin().from('notifications').insert({
      user_id: input.userId,
      organization_id: input.organizationId,
      trip_id: input.tripId,
      channel: 'in_app',
      kind: 'trip_invite',
      title: `You're invited: ${input.tripName}`,
      body: `${input.invitedByName} invited you to join this trip. Open Notifications or the trip Members tab to Accept or Decline.`,
      payload: {
        tripId: input.tripId,
        action: 'respond_invite',
      },
    });

    if (error) {
      // Invite itself already succeeded — don't fail the request on notification write.
      console.warn('Failed to create trip invite notification', error.message);
    }
  }

  async markRead(id: string, userId: string): Promise<AppNotification> {
    if (assertDbOrMock('notifications') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to update notifications');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select(NOTIFICATION_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'NOTIFICATION_NOT_FOUND', `Notification ${id} was not found`);
    }

    return mapRow(data as NotificationRow);
  }

  async markAllRead(userId: string): Promise<void> {
    if (assertDbOrMock('notifications') === 'memory') {
      return;
    }

    const { error } = await getSupabaseAdmin()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
  }
}
