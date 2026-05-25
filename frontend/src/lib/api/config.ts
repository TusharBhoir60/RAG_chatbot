/** Shared API base URLs (must match FastAPI `api_router` prefix). */
export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const API_V1_BASE = `${API_ORIGIN}/api/v1`;
