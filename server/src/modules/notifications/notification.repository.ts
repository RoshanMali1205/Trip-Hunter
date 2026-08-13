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
}

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.body ?? '',
    type: row.kind,
    read: row.read_at !== null,
    createdAt: row.created_at,
  };
}

export class NotificationRepository {
  async findByUser(userId: string): Promise<AppNotification[]> {
    if (assertDbOrMock('notifications') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('notifications')
      .select('id, kind, title, body, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as NotificationRow[]).map(mapRow);
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
      .select('id, kind, title, body, read_at, created_at')
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
