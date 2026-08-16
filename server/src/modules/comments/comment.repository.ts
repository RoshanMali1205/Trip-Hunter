import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';
import { recordActivity } from '../activity/activity.repository.js';

export type CommentSubjectType =
  | 'trip'
  | 'task'
  | 'expense'
  | 'booking'
  | 'document'
  | 'itinerary';

export interface TripComment {
  id: string;
  tripId: string;
  subjectType: CommentSubjectType;
  subjectId: string | null;
  parentId: string | null;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentRow {
  id: string;
  trip_id: string;
  subject_type: CommentSubjectType;
  subject_id: string | null;
  parent_id: string | null;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string } | null;
}

const memoryComments: TripComment[] = [];

function mapRow(row: CommentRow): TripComment {
  return {
    id: row.id,
    tripId: row.trip_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    parentId: row.parent_id,
    body: row.body,
    authorId: row.author_id,
    authorName: row.profiles?.display_name ?? 'Someone',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COMMENT_SELECT =
  'id, trip_id, subject_type, subject_id, parent_id, body, author_id, created_at, updated_at, profiles!author_id(display_name)';

export interface CreateCommentInput {
  tripId: string;
  body: string;
  subjectType?: CommentSubjectType;
  subjectId?: string | null;
  parentId?: string | null;
  authorId: string;
  authorName?: string;
  organizationId?: string | null;
}

export class CommentRepository {
  async findByTrip(tripId: string): Promise<TripComment[]> {
    if (assertDbOrMock('comments') === 'memory') {
      return memoryComments
        .filter((c) => c.tripId === tripId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    const { data, error } = await getSupabaseAdmin()
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as CommentRow[]).map(mapRow);
  }

  async create(input: CreateCommentInput): Promise<TripComment> {
    const subjectType = input.subjectType ?? 'trip';
    const body = input.body.trim();
    if (!body) {
      throw new AppError(400, 'VALIDATION_ERROR', 'body is required');
    }

    if (assertDbOrMock('comments') === 'memory') {
      const comment: TripComment = {
        id: randomUUID(),
        tripId: input.tripId,
        subjectType,
        subjectId: input.subjectId ?? null,
        parentId: input.parentId ?? null,
        body,
        authorId: input.authorId,
        authorName: input.authorName ?? 'Someone',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryComments.push(comment);
      await recordActivity({
        organizationId: input.organizationId ?? null,
        tripId: input.tripId,
        actorId: input.authorId,
        actorName: input.authorName,
        action: 'commented',
        entityType: 'comment',
        entityId: comment.id,
        message: `${input.authorName ?? 'Someone'} commented on the trip`,
      });
      return comment;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('comments')
      .insert({
        trip_id: input.tripId,
        subject_type: subjectType,
        subject_id: input.subjectId ?? null,
        parent_id: input.parentId ?? null,
        body,
        author_id: input.authorId,
      })
      .select(COMMENT_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const comment = mapRow(data as unknown as CommentRow);
    await recordActivity({
      organizationId: input.organizationId ?? null,
      tripId: input.tripId,
      actorId: input.authorId,
      actorName: input.authorName,
      action: 'commented',
      entityType: 'comment',
      entityId: comment.id,
      message: `${input.authorName ?? 'Someone'} commented on the trip`,
    });
    return comment;
  }

  async delete(tripId: string, id: string, requesterId: string): Promise<void> {
    if (assertDbOrMock('comments') === 'memory') {
      const index = memoryComments.findIndex((c) => c.id === id && c.tripId === tripId);
      if (index === -1) {
        throw new AppError(404, 'COMMENT_NOT_FOUND', `Comment ${id} was not found`);
      }
      const comment = memoryComments[index]!;
      if (comment.authorId !== requesterId) {
        throw new AppError(403, 'FORBIDDEN', 'Only the author can delete this comment');
      }
      memoryComments.splice(index, 1);
      return;
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('comments')
      .select('id, author_id')
      .eq('id', id)
      .eq('trip_id', tripId)
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'COMMENT_NOT_FOUND', `Comment ${id} was not found`);
    }
    if ((data as { author_id: string }).author_id !== requesterId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the author can delete this comment');
    }

    const { error: deleteError } = await db.from('comments').delete().eq('id', id);
    if (deleteError) {
      throw new AppError(502, 'DB_ERROR', deleteError.message);
    }
  }
}
