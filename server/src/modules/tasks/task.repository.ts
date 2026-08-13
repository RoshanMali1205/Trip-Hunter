import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
type DbTaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
type DbTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TripTask {
  id: string;
  tripId: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
}

interface TaskRow {
  id: string;
  trip_id: string;
  title: string;
  description: string | null;
  status: DbTaskStatus;
  priority: DbTaskPriority;
  assignee_id: string | null;
  due_at: string | null;
  profiles: { display_name: string } | null;
}

const STATUS_TO_APP: Record<DbTaskStatus, TaskStatus> = {
  todo: 'TODO',
  in_progress: 'IN_PROGRESS',
  blocked: 'BLOCKED',
  done: 'COMPLETED',
  cancelled: 'COMPLETED',
};

const STATUS_TO_DB: Record<TaskStatus, DbTaskStatus> = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  COMPLETED: 'done',
};

const PRIORITY_TO_APP: Record<DbTaskPriority, TaskPriority> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'CRITICAL',
};

function mapRow(row: TaskRow): TripTask {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    description: row.description ?? '',
    assignedTo: row.assignee_id ?? '',
    assignedToName: row.profiles?.display_name ?? 'Unassigned',
    priority: PRIORITY_TO_APP[row.priority],
    status: STATUS_TO_APP[row.status],
    dueDate: row.due_at,
  };
}

const TASK_SELECT =
  'id, trip_id, title, description, status, priority, assignee_id, due_at, profiles!assignee_id(display_name)';

export class TaskRepository {
  async findByTrip(tripId: string): Promise<TripTask[]> {
    if (assertDbOrMock('tasks') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('tasks')
      .select(TASK_SELECT)
      .eq('trip_id', tripId)
      .order('due_at', { ascending: true, nullsFirst: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as TaskRow[]).map(mapRow);
  }

  async updateStatus(id: string, status: TaskStatus): Promise<TripTask> {
    if (assertDbOrMock('tasks') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to update tasks');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('tasks')
      .update({ status: STATUS_TO_DB[status] })
      .eq('id', id)
      .select(TASK_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'TASK_NOT_FOUND', `Task ${id} was not found`);
    }

    return mapRow(data as unknown as TaskRow);
  }
}
