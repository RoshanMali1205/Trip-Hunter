import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { ok } from '../../types/api.js';
import { DocumentRepository, type DocumentType } from './document.repository.js';

const repo = new DocumentRepository();
const VALID_TYPES: DocumentType[] = ['itinerary', 'receipt', 'ticket', 'policy', 'other'];
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const listDocuments: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const documents = await repo.findByTrip(tripId);
    res.json(ok(documents, 'Documents retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const createDocument: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const body = req.body as {
      title?: unknown;
      docType?: unknown;
      fileName?: unknown;
      mimeType?: unknown;
      contentBase64?: unknown;
    };

    if (typeof body.title !== 'string' || !body.title.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'title is required');
    }
    const docType =
      typeof body.docType === 'string' && VALID_TYPES.includes(body.docType as DocumentType)
        ? (body.docType as DocumentType)
        : 'other';
    if (typeof body.fileName !== 'string' || !body.fileName.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'fileName is required');
    }
    const fileName = body.fileName.trim();
    let mimeType =
      typeof body.mimeType === 'string' && body.mimeType.trim()
        ? body.mimeType.trim()
        : 'application/octet-stream';
    if (!ALLOWED_MIME.has(mimeType)) {
      const lower = fileName.toLowerCase();
      if (lower.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (lower.endsWith('.png')) mimeType = 'image/png';
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (lower.endsWith('.webp')) mimeType = 'image/webp';
      else if (lower.endsWith('.gif')) mimeType = 'image/gif';
      else if (lower.endsWith('.txt')) mimeType = 'text/plain';
      else if (lower.endsWith('.doc')) mimeType = 'application/msword';
      else if (lower.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    }
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `Unsupported file type. Allowed: PDF, images, TXT, DOC/DOCX`,
      );
    }
    if (typeof body.contentBase64 !== 'string' || !body.contentBase64.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'contentBase64 is required');
    }

    const document = await repo.create({
      tripId,
      title: body.title.trim(),
      docType,
      fileName,
      mimeType,
      contentBase64: body.contentBase64,
      uploadedBy: req.user?.id ?? null,
      uploadedByName: req.user?.displayName ?? req.user?.email,
      organizationId: req.user?.organizationId ?? null,
    });
    res.status(201).json(ok(document, 'Document uploaded successfully'));
  } catch (err) {
    next(err);
  }
};

export const deleteDocument: RequestHandler = async (req, res, next) => {
  try {
    const tripId = String(req.params['tripId']);
    const id = String(req.params['id']);
    await repo.delete(tripId, id);
    res.json(ok(null, 'Document deleted successfully'));
  } catch (err) {
    next(err);
  }
};
