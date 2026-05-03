/** Normalize FastAPI / Starlette error payloads to a single user-facing string. */

export function formatApiDetail(detail: unknown): string {
  if (detail == null) {
    return 'Request failed';
  }
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (item != null && typeof item === 'object' && 'msg' in item) {
        return String((item as { msg: string }).msg);
      }
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    });
    return parts.join('; ');
  }
  if (typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message: unknown }).message);
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return 'Request failed';
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  return false;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
