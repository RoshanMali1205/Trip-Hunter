import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';
import { recordActivity } from '../activity/activity.repository.js';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ApprovalSubjectType = 'expense' | 'booking' | 'budget' | 'trip';

export interface Approval {
  id: string;
  tripId: string;
  tripName: string;
  subjectType: ApprovalSubjectType;
  subjectId: string;
  status: ApprovalStatus;
  requestedBy: string | null;
  requestedByName: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string;
  createdAt: string;
}

interface ApprovalRow {
  id: string;
  trip_id: string;
  subject_type: ApprovalSubjectType;
  subject_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  trips: { name: string; organization_id: string } | null;
  requester: { display_name: string } | null;
}

const STATUS_TO_APP: Record<ApprovalRow['status'], ApprovalStatus> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  cancelled: 'CANCELLED',
};

const STATUS_TO_DB: Record<ApprovalStatus, ApprovalRow['status']> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

const memoryApprovals: Approval[] = [];

function mapRow(row: ApprovalRow): Approval {
  return {
    id: row.id,
    tripId: row.trip_id,
    tripName: row.trips?.name ?? 'Trip',
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    status: STATUS_TO_APP[row.status],
    requestedBy: row.requested_by,
    requestedByName: row.requester?.display_name ?? 'Someone',
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    notes: row.notes ?? '',
    createdAt: row.created_at,
  };
}

const APPROVAL_SELECT =
  'id, trip_id, subject_type, subject_id, status, requested_by, reviewed_by, reviewed_at, notes, created_at, trips(name, organization_id), requester:profiles!requested_by(display_name)';

export class ApprovalRepository {
  async findByTrip(tripId: string): Promise<Approval[]> {
    if (assertDbOrMock('approvals') === 'memory') {
      return memoryApprovals.filter((a) => a.tripId === tripId);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('approvals')
      .select(APPROVAL_SELECT)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as ApprovalRow[]).map(mapRow);
  }

  async findPendingForOrg(organizationId: string): Promise<Approval[]> {
    if (assertDbOrMock('approvals') === 'memory') {
      return memoryApprovals.filter((a) => a.status === 'PENDING');
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
      .from('approvals')
      .select(APPROVAL_SELECT)
      .in('trip_id', tripIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as ApprovalRow[]).map(mapRow);
  }

  async createTripApproval(input: {
    tripId: string;
    tripName: string;
    organizationId: string | null;
    requestedBy: string | null;
    requestedByName?: string;
  }): Promise<Approval> {
    if (assertDbOrMock('approvals') === 'memory') {
      const approval: Approval = {
        id: randomUUID(),
        tripId: input.tripId,
        tripName: input.tripName,
        subjectType: 'trip',
        subjectId: input.tripId,
        status: 'PENDING',
        requestedBy: input.requestedBy,
        requestedByName: input.requestedByName ?? 'Someone',
        reviewedBy: null,
        reviewedAt: null,
        notes: '',
        createdAt: new Date().toISOString(),
      };
      memoryApprovals.unshift(approval);
      return approval;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('approvals')
      .insert({
        trip_id: input.tripId,
        subject_type: 'trip',
        subject_id: input.tripId,
        status: 'pending',
        requested_by: input.requestedBy,
      })
      .select(APPROVAL_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return mapRow(data as unknown as ApprovalRow);
  }

  async review(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewerId: string,
    notes?: string,
  ): Promise<Approval> {
    if (assertDbOrMock('approvals') === 'memory') {
      const approval = memoryApprovals.find((a) => a.id === id);
      if (!approval) {
        throw new AppError(404, 'APPROVAL_NOT_FOUND', `Approval ${id} was not found`);
      }
      approval.status = status;
      approval.reviewedBy = reviewerId;
      approval.reviewedAt = new Date().toISOString();
      approval.notes = notes ?? '';
      return approval;
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('approvals')
      .update({
        status: STATUS_TO_DB[status],
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        notes: notes ?? null,
      })
      .eq('id', id)
      .select(APPROVAL_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'APPROVAL_NOT_FOUND', `Approval ${id} was not found`);
    }

    const approval = mapRow(data as unknown as ApprovalRow);

    if (approval.subjectType === 'trip') {
      const tripApprovalStatus = status === 'APPROVED' ? 'approved' : 'rejected';
      await db
        .from('trips')
        .update({ approval_status: tripApprovalStatus })
        .eq('id', approval.tripId);
    }

    await recordActivity({
      organizationId: (data as unknown as ApprovalRow).trips?.organization_id ?? null,
      tripId: approval.tripId,
      actorId: reviewerId,
      action: status === 'APPROVED' ? 'approved' : 'rejected',
      entityType: 'approval',
      entityId: approval.id,
      message: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${approval.subjectType} for ${approval.tripName}`,
    });

    return approval;
  }
}
