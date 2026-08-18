/** Read the message from a Trip Hunter `{ success: false, error: { message } }` HTTP error. */
export function readApiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') {
    return fallback;
  }

  const body = (err as { error?: unknown }).error;
  if (body && typeof body === 'object') {
    const nested = (body as { error?: { message?: unknown } }).error;
    if (typeof nested?.message === 'string' && nested.message.trim()) {
      return nested.message.trim();
    }
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  if (err instanceof Error && err.message.trim()) {
    const raw = err.message.trim();
    if (!raw.startsWith('Http failure response')) {
      return raw;
    }
  }

  return fallback;
}
