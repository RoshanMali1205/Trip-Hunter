import type { ErrorRequestHandler, RequestHandler } from 'express';
import { fail } from '../types/api.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(fail('NOT_FOUND', 'Resource not found'));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json(fail(err.code, err.message, err.details));
    return;
  }

  console.error('[api] Unhandled error:', err);
  res.status(500).json(fail('INTERNAL_ERROR', 'An unexpected error occurred'));
};
