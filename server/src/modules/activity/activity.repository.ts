import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

export interface ActivityLog {
  id: string;
  organizationId: string | null;
  tripId: string | null;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  message: string;
  createdAt: string;
}

export interface CreateActivityInput {
  organizationId?: string | null;
  tripId?: string | null;
  actorId?: string | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
}

interface ActivityRow {
  id: string;
  organization_id: string | null;
  trip_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles: { display_name: string } | null;
}

const memoryActivity: ActivityLog[] = [];

function mapRow(row: ActivityRow): ActivityLog {
  const metaMessage =
    typeof row.metadata?.['message'] === 'string' ? String(row.metadata['message']) : '';
  const actorName = row.profiles?.display_name ?? 'Someone';
  return {
    id: row.id,
    organizationId: row.organization_id,
    tripId: row.trip_id,
    actorId: row.actor_id,
    actorName,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    message: metaMessage || `${actorName} ${row.action.replaceAll('_', ' ')} ${row.entity_type}`,
    createdAt: row.created_at,
  };
}

export class ActivityRepository {
  async log(input: CreateActivityInput): Promise<ActivityLog> {
    if (assertDbOrMock('activity') === 'memory') {
      const entry: ActivityLog = {
        id: randomUUID(),
        organizationId: input.organizationId ?? null,
        tripId: input.tripId ?? null,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? 'Someone',
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        message: input.message,
        createdAt: new Date().toISOString(),
      };
      memoryActivity.unshift(entry);
      return entry;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('activity_logs')
      .insert({
        organization_id: input.organizationId ?? null,
        trip_id: input.tripId ?? null,
        actor_id: input.actorId ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        metadata: { ...(input.metadata ?? {}), message: input.message },
      })
      .select(
        'id, organization_id, trip_id, actor_id, action, entity_type, entity_id, metadata, created_at, profiles!actor_id(display_name)',
      )
      .single();

    if (error) {
      // Activity should not break primary writes — log and return a synthetic entry.
      console.warn('activity_logs insert failed:', error.message);
      return {
        id: randomUUID(),
        organizationId: input.organizationId ?? null,
        tripId: input.tripId ?? null,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? 'Someone',
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        message: input.message,
        createdAt: new Date().toISOString(),
      };
    }

    return mapRow(data as unknown as ActivityRow);
  }

  async findByTrip(tripId: string, limit = 50): Promise<ActivityLog[]> {
    if (assertDbOrMock('activity') === 'memory') {
      return memoryActivity.filter((a) => a.tripId === tripId).slice(0, limit);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('activity_logs')
      .select(
        'id, organization_id, trip_id, actor_id, action, entity_type, entity_id, metadata, created_at, profiles!actor_id(display_name)',
      )
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as ActivityRow[]).map(mapRow);
  }

  async findRecentForOrg(organizationId: string, limit = 20): Promise<ActivityLog[]> {
    if (assertDbOrMock('activity') === 'memory') {
      return memoryActivity
        .filter((a) => a.organizationId === organizationId)
        .slice(0, limit);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('activity_logs')
      .select(
        'id, organization_id, trip_id, actor_id, action, entity_type, entity_id, metadata, created_at, profiles!actor_id(display_name)',
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as ActivityRow[]).map(mapRow);
  }
}

/** Fire-and-forget activity write used by other modules. */
export async function recordActivity(input: CreateActivityInput): Promise<void> {
  try {
    await new ActivityRepository().log(input);
  } catch (err) {
    console.warn('recordActivity failed', err);
  }
}
