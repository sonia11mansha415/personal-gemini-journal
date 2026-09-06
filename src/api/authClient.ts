import { auth } from '../firebase';

/**
 * Validates and retrieves a fresh, complete Firebase ID token (JWT).
 * Returns null if no authenticated user exists or if token is malformed/empty.
 */
export async function getValidIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  try {
    const token = await user.getIdToken(forceRefresh);
    if (!token || typeof token !== 'string') {
      return null;
    }

    const trimmed = token.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }

    // A valid Firebase ID token is a 3-part base64url JWT: header.payload.signature
    const parts = trimmed.split('.');
    if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
      console.warn('Firebase ID token is not a valid 3-part JWT string');
      return null;
    }

    return trimmed;
  } catch (err) {
    console.warn('Failed to retrieve Firebase ID token:', err);
    return null;
  }
}

/**
 * Shared authenticated fetch helper.
 * Rules:
 * - The frontend must NEVER call a protected endpoint until a valid authenticated Firebase user exists.
 * - Confirms currentUser exists
 * - Obtains a valid ID token with getIdToken()
 * - Sends exactly: Authorization: Bearer <complete Firebase ID token>
 * - If no authenticated user exists: does not make the protected request and returns null.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response | null> {
  // Confirm currentUser exists before doing anything
  if (!auth.currentUser) {
    return null;
  }

  const token = await getValidIdToken();
  if (!token) {
    return null;
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Type-safe JSON helpers that wrap authenticatedFetch
 */
export async function authenticatedJsonRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<{ ok: boolean; status: number; data?: T; error?: string } | null> {
  if (!auth.currentUser) {
    return null;
  }

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  const res = await authenticatedFetch(endpoint, init);
  if (!res) {
    return null;
  }

  try {
    const data = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      data: res.ok ? data : undefined,
      error: !res.ok ? (data?.error || `Server responded with ${res.status}`) : undefined,
    };
  } catch (err: any) {
    return {
      ok: res.ok,
      status: res.status,
      error: !res.ok ? `Server error (${res.status})` : undefined,
    };
  }
}
