/*
 * Phause — Org Users API (Steps 2.1–2.4 from Postman).
 *
 * Super-admin routes use adminToken + x-tenant-id header.
 * Endpoints (all under /api/admin/):
 *   GET    /api/admin/users              (x-tenant-id: orgId)
 *   POST   /api/admin/users              — create user
 *   PATCH  /api/admin/users/:id          — update role/active/consent
 *   DELETE /api/admin/users/:id          — soft-deactivate (204)
 */

import { ApiError } from '../client';
import { getAdminToken, useAuthStore } from '../../stores/auth.store';
import type { OrgUserRecord } from '../../pages/organisations/OrgUser';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** Org users need both adminToken AND x-tenant-id header — custom fetch. */
async function adminFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const orgId = useAuthStore.getState().orgId ?? 'org-1';
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id':  orgId,
  };
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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function adapt(raw: Record<string, unknown>): OrgUserRecord {
  return {
    orgId:      String(raw.orgId ?? raw.org_id ?? ''),
    email:      String(raw.email ?? ''),
    role:       String(raw.role ?? 'org_admin'),
    active:     Boolean(raw.active ?? true),
    hasConsent: Boolean(raw.hasConsent ?? raw.has_consent ?? true),
  };
}

export async function listOrgUsers(): Promise<OrgUserRecord[]> {
  try {
    const raw = await adminFetch<unknown[]>('GET', '/api/admin/users');
    if (!Array.isArray(raw)) return [];
    return raw.map((r) => adapt(r as Record<string, unknown>));
  } catch { return []; }
}

export async function createOrgUser(values: {
  email: string; password: string; role: string; hasConsent: boolean;
}): Promise<OrgUserRecord> {
  const orgId = useAuthStore.getState().orgId ?? 'org-1';
  const raw = await adminFetch<Record<string, unknown>>('POST', '/api/admin/users', {
    orgId, ...values,
  });
  // response wraps user under .user
  const user = (raw.user ?? raw) as Record<string, unknown>;
  return adapt({ ...user, orgId });
}

export async function updateOrgUser(userId: string, values: {
  role: string; active: boolean; hasConsent: boolean;
}): Promise<OrgUserRecord> {
  const raw = await adminFetch<Record<string, unknown>>(
    'PATCH', `/api/admin/users/${encodeURIComponent(userId)}`, values,
  );
  return adapt(raw.user ? (raw.user as Record<string, unknown>) : raw);
}

export async function deleteOrgUser(userId: string): Promise<void> {
  await adminFetch<void>('DELETE', `/api/admin/users/${encodeURIComponent(userId)}`);
}
