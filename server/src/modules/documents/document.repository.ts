import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';
import { recordActivity } from '../activity/activity.repository.js';

export type DocumentType = 'itinerary' | 'receipt' | 'ticket' | 'policy' | 'other';

export interface TripDocument {
  id: string;
  tripId: string;
  title: string;
  docType: DocumentType;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedBy: string | null;
  uploadedByName: string;
  createdAt: string;
}

interface DocumentRow {
  id: string;
  trip_id: string;
  title: string;
  doc_type: DocumentType;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
}

const BUCKET = 'trip-documents';
const MAX_BYTES = 5 * 1024 * 1024;

const memoryDocs: TripDocument[] = [];
const memoryContent = new Map<string, string>();

function mapRow(row: DocumentRow, url: string): TripDocument {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    docType: row.doc_type,
    storagePath: row.storage_path,
    mimeType: row.mime_type ?? 'application/octet-stream',
    sizeBytes: Number(row.size_bytes ?? 0),
    url,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.profiles?.display_name ?? 'Someone',
    createdAt: row.created_at,
  };
}

const DOC_SELECT =
  'id, trip_id, title, doc_type, storage_path, mime_type, size_bytes, uploaded_by, created_at, profiles!uploaded_by(display_name)';

function publicUrl(path: string): string {
  const { data } = getSupabaseAdmin().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export interface CreateDocumentInput {
  tripId: string;
  title: string;
  docType: DocumentType;
  fileName: string;
  mimeType: string;
  contentBase64: string;
  uploadedBy: string | null;
  uploadedByName?: string;
  organizationId?: string | null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'document';
}

function decodeBase64(contentBase64: string): Buffer {
  const cleaned = contentBase64.includes(',')
    ? contentBase64.slice(contentBase64.indexOf(',') + 1)
    : contentBase64;
  const buf = Buffer.from(cleaned, 'base64');
  if (!buf.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'file content is empty or invalid');
  }
  if (buf.length > MAX_BYTES) {
    throw new AppError(400, 'VALIDATION_ERROR', 'file must be 5MB or smaller');
  }
  return buf;
}

export class DocumentRepository {
  async findByTrip(tripId: string): Promise<TripDocument[]> {
    if (assertDbOrMock('documents') === 'memory') {
      return memoryDocs.filter((d) => d.tripId === tripId);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('documents')
      .select(DOC_SELECT)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as unknown as DocumentRow[]).map((row) =>
      mapRow(row, publicUrl(row.storage_path)),
    );
  }

  async create(input: CreateDocumentInput): Promise<TripDocument> {
    const bytes = decodeBase64(input.contentBase64);
    const safeName = sanitizeFileName(input.fileName);
    const storagePath = `${input.tripId}/${randomUUID()}-${safeName}`;

    if (assertDbOrMock('documents') === 'memory') {
      const dataUrl = `data:${input.mimeType};base64,${bytes.toString('base64')}`;
      const doc: TripDocument = {
        id: randomUUID(),
        tripId: input.tripId,
        title: input.title,
        docType: input.docType,
        storagePath,
        mimeType: input.mimeType,
        sizeBytes: bytes.length,
        url: dataUrl,
        uploadedBy: input.uploadedBy,
        uploadedByName: input.uploadedByName ?? 'Someone',
        createdAt: new Date().toISOString(),
      };
      memoryDocs.unshift(doc);
      memoryContent.set(doc.id, dataUrl);
      await recordActivity({
        organizationId: input.organizationId ?? null,
        tripId: input.tripId,
        actorId: input.uploadedBy,
        actorName: input.uploadedByName,
        action: 'uploaded',
        entityType: 'document',
        entityId: doc.id,
        message: `${input.uploadedByName ?? 'Someone'} uploaded “${doc.title}”`,
      });
      return doc;
    }

    const db = getSupabaseAdmin();
    const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: input.mimeType,
      upsert: false,
    });

    if (uploadError) {
      throw new AppError(502, 'STORAGE_ERROR', uploadError.message);
    }

    const { data, error } = await db
      .from('documents')
      .insert({
        trip_id: input.tripId,
        title: input.title,
        doc_type: input.docType,
        storage_path: storagePath,
        mime_type: input.mimeType,
        size_bytes: bytes.length,
        uploaded_by: input.uploadedBy,
      })
      .select(DOC_SELECT)
      .single();

    if (error) {
      await db.storage.from(BUCKET).remove([storagePath]);
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const doc = mapRow(data as unknown as DocumentRow, publicUrl(storagePath));
    await recordActivity({
      organizationId: input.organizationId ?? null,
      tripId: input.tripId,
      actorId: input.uploadedBy,
      actorName: input.uploadedByName,
      action: 'uploaded',
      entityType: 'document',
      entityId: doc.id,
      message: `${input.uploadedByName ?? 'Someone'} uploaded “${doc.title}”`,
    });
    return doc;
  }

  async delete(tripId: string, id: string): Promise<void> {
    if (assertDbOrMock('documents') === 'memory') {
      const index = memoryDocs.findIndex((d) => d.id === id && d.tripId === tripId);
      if (index === -1) {
        throw new AppError(404, 'DOCUMENT_NOT_FOUND', `Document ${id} was not found`);
      }
      memoryDocs.splice(index, 1);
      memoryContent.delete(id);
      return;
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('documents')
      .select('id, storage_path')
      .eq('id', id)
      .eq('trip_id', tripId)
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', `Document ${id} was not found`);
    }

    const path = String((data as { storage_path: string }).storage_path);
    const { error: deleteError } = await db.from('documents').delete().eq('id', id);
    if (deleteError) {
      throw new AppError(502, 'DB_ERROR', deleteError.message);
    }
    await db.storage.from(BUCKET).remove([path]);
  }
}
