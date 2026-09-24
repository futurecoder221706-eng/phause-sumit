/*
 * Phause — HTTP client.
 *
 * Thin fetch wrapper that:
 * - Prefixes every request with VITE_API_URL
 * - Attaches Authorization header from the token getter passed in
 * - Throws a structured ApiError on non-2xx responses so callers can
 *   distinguish network errors from API errors
 *
 * Usage:
 *   import { apiClient } from './client';
 *   const data = await apiClient.get('/api/reports', getAppToken);
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

type TokenGetter = () => string | null;

async function request<T>(
  method: string,
  path: string,
  getToken: TokenGetter | null,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders };
  const token = getToken?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errBody: unknown;
    try { errBody = await res.json(); } catch { errBody = await res.text(); }
    throw new ApiError(res.status, errBody, `${method} ${path} → ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const apiClient = {
  get:    <T>(path: string, getToken: TokenGetter | null = null, headers?: Record<string, string>) => request<T>('GET',    path, getToken, undefined, headers),
  post:   <T>(path: string, getToken: TokenGetter | null, body?: unknown, headers?: Record<string, string>) => request<T>('POST',   path, getToken, body, headers),
  patch:  <T>(path: string, getToken: TokenGetter | null, body?: unknown, headers?: Record<string, string>) => request<T>('PATCH',  path, getToken, body, headers),
  delete: <T>(path: string, getToken: TokenGetter | null, headers?: Record<string, string>) => request<T>('DELETE', path, getToken, undefined, headers),
};
