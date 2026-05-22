// API error responses come in two shapes: Zod validation failures arrive as
// { errors: [{ path, message }] }; everything else as { error: 'message' }.
// These helpers normalize both so callers don't have to branch every time.

interface ApiErrorBody {
  error?: unknown;
  errors?: unknown;
}

export const isApiError = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false;
  const body = data as ApiErrorBody;
  return body.error != null || body.errors != null;
};

export const getApiErrorMessage = (data: unknown, fallback: string): string => {
  if (data && typeof data === 'object') {
    const body = data as ApiErrorBody;

    if (Array.isArray(body.errors)) {
      const messages = body.errors
        .map(issue =>
          issue && typeof issue === 'object'
            ? (issue as { message?: string }).message
            : null
        )
        .filter((message): message is string => !!message);
      if (messages.length > 0) return messages.join(', ');
    }

    if (typeof body.error === 'string') return body.error;

    if (body.error && typeof body.error === 'object') {
      const message = (body.error as { message?: string }).message;
      if (message) return message;
    }
  }

  return fallback;
};
