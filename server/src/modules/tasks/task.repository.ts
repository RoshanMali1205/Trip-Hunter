import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';
import { recordActivity } from '../activity/activity.repository.js';

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

const PRIORITY_TO_DB: Record<TaskPriority, DbTaskPriority> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'urgent',
};

const memoryTasks: TripTask[] = [];

export interface CreateTaskInput {
  tripId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignedTo?: string | null;
  dueDate?: string | null;
  createdBy?: string | null;
  createdByName?: string;
  organizationId?: string | null;
}

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
      return memoryTasks.filter((t) => t.tripId === tripId);
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

  async findByOrganization(organizationId: string): Promise<TripTask[]> {
    if (assertDbOrMock('tasks') === 'memory') {
      return [...memoryTasks];
    }

    const db = getSupabaseAdmin();

    const { data: trips, error: tripsError } = await db
      .from('trips')
      .select('id')
      .eq('organization_id', organizationId);

    if (tripsError) {
      throw new AppError(502, 'DB_ERROR', tripsError.message);
    }

    const tripIds = ((trips ?? []) as { id: string }[]).map((t) => t.id);
    if (tripIds.length === 0) {
      return [];
    }

    const { data, error } = await db
      .from('tasks')
      .select(TASK_SELECT)
      .in('trip_id', tripIds)
      .order('due_at', { ascending: true, nullsFirst: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as TaskRow[]).map(mapRow);
  }

  async create(input: CreateTaskInput): Promise<TripTask> {
    if (assertDbOrMock('tasks') === 'memory') {
      const task: TripTask = {
        id: randomUUID(),
        tripId: input.tripId,
        title: input.title,
        description: input.description ?? '',
        assignedTo: input.assignedTo ?? '',
        assignedToName: input.assignedTo ? 'Teammate' : 'Unassigned',
        priority: input.priority ?? 'MEDIUM',
        status: 'TODO',
        dueDate: input.dueDate ?? null,
      };
      memoryTasks.unshift(task);
      await recordActivity({
        organizationId: input.organizationId ?? null,
        tripId: input.tripId,
        actorId: input.createdBy ?? null,
        actorName: input.createdByName,
        action: 'created',
        entityType: 'task',
        entityId: task.id,
        message: `${input.createdByName ?? 'Someone'} created task “${task.title}”`,
      });
      return task;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('tasks')
      .insert({
        trip_id: input.tripId,
        title: input.title,
        description: input.description || null,
        priority: PRIORITY_TO_DB[input.priority ?? 'MEDIUM'],
        status: 'todo',
        assignee_id: input.assignedTo || null,
        due_at: input.dueDate || null,
        created_by: input.createdBy ?? null,
      })
      .select(TASK_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const task = mapRow(data as unknown as TaskRow);
    await recordActivity({
      organizationId: input.organizationId ?? null,
      tripId: input.tripId,
      actorId: input.createdBy ?? null,
      actorName: input.createdByName,
      action: 'created',
      entityType: 'task',
      entityId: task.id,
      message: `${input.createdByName ?? 'Someone'} created task “${task.title}”`,
    });
    return task;
  }

  async update(
    id: string,
    input: { status?: TaskStatus; assignedTo?: string | null },
  ): Promise<TripTask> {
    if (assertDbOrMock('tasks') === 'memory') {
      const task = memoryTasks.find((t) => t.id === id);
      if (!task) {
        throw new AppError(404, 'TASK_NOT_FOUND', `Task ${id} was not found`);
      }
      if (input.status) task.status = input.status;
      if (input.assignedTo !== undefined) {
        task.assignedTo = input.assignedTo ?? '';
        task.assignedToName = input.assignedTo ? 'Teammate' : 'Unassigned';
      }
      return task;
    }

    const patch: Record<string, unknown> = {};
    if (input.status) patch['status'] = STATUS_TO_DB[input.status];
    if (input.assignedTo !== undefined) patch['assignee_id'] = input.assignedTo || null;

    if (Object.keys(patch).length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'No task fields to update');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('tasks')
      .update(patch)
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
