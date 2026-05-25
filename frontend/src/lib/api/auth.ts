/**
 * Obtain a signed API JWT from the Next.js BFF route (never send raw user ids).
 */

let cachedAccessToken: string | null = null;

export function clearApiAccessToken(): void {
  cachedAccessToken = null;
}

export async function getApiAccessToken(): Promise<string | null> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const res = await fetch('/api/auth/token', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!res.ok) {
    cachedAccessToken = null;
    return null;
  }

  const data: unknown = await res.json();
  if (
    data !== null &&
    typeof data === 'object' &&
    'accessToken' in data &&
    typeof (data as { accessToken: unknown }).accessToken === 'string'
  ) {
    cachedAccessToken = (data as { accessToken: string }).accessToken;
    return cachedAccessToken;
  }

  return null;
}
