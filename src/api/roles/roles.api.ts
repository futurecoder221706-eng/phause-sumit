/*
 * Phause — Roles API (RBAC).
 *
 * All routes use adminToken (Bearer).
 * Endpoints:
 *   GET  /roles          — List roles
 *   POST /roles          — Create role (with permissions array)
 *   POST /roles/assign   — Assign a role to an org user
 */

import { apiClient } from '../client';
import { getAdminToken, useAuthStore } from '../../stores/auth.store';
import { listOrgUsers } from '../organisations/orgUsers.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
}

export interface RoleAssignment {
  userId: string;
  roleName: string;
}

export type RoleFormValues = Omit<Role, 'id' | 'createdAt'>;

// ── All available permissions (grouped for the UI) ────────────────────────────

export const PERMISSION_GROUPS: Array<{ group: string; permissions: Array<{ key: string; label: string }> }> = [
  {
    group: 'Organisations',
    permissions: [
      { key: 'organisations:read',   label: 'View organisations' },
      { key: 'organisations:create', label: 'Create organisation' },
      { key: 'organisations:update', label: 'Update organisation' },
      { key: 'organisations:delete', label: 'Delete organisation' },
    ],
  },
  {
    group: 'Employees',
    permissions: [
      { key: 'employees:read',   label: 'View employees' },
      { key: 'employees:create', label: 'Add employee' },
      { key: 'employees:update', label: 'Edit employee' },
      { key: 'employees:delete', label: 'Remove employee' },
      { key: 'employees:import', label: 'Bulk import employees' },
    ],
  },
  {
    group: 'Campaigns',
    permissions: [
      { key: 'campaigns:read',     label: 'View campaigns' },
      { key: 'campaigns:create',   label: 'Create campaign' },
      { key: 'campaigns:dispatch', label: 'Dispatch campaign' },
      { key: 'campaigns:cancel',   label: 'Cancel campaign' },
    ],
  },
  {
    group: 'Templates',
    permissions: [
      { key: 'templates:read',   label: 'View templates' },
      { key: 'templates:create', label: 'Create template' },
      { key: 'templates:update', label: 'Edit template' },
      { key: 'templates:delete', label: 'Delete template' },
    ],
  },
  {
    group: 'Reports & Risk',
    permissions: [
      { key: 'reports:read',      label: 'View reports' },
      { key: 'reports:generate',  label: 'Generate reports' },
      { key: 'reports:export',    label: 'Export reports' },
      { key: 'risk-scores:read',  label: 'View risk scores' },
    ],
  },
  {
    group: 'Training',
    permissions: [
      { key: 'training:read',     label: 'View training modules' },
      { key: 'training:create',   label: 'Create training module' },
      { key: 'training:complete', label: 'Record completions' },
    ],
  },
  {
    group: 'Billing',
    permissions: [
      { key: 'billing:read',   label: 'View billing & plans' },
      { key: 'billing:manage', label: 'Manage subscription' },
    ],
  },
  {
    group: 'RBAC',
    permissions: [
      { key: 'roles:read',   label: 'View roles' },
      { key: 'roles:create', label: 'Create roles' },
      { key: 'roles:assign', label: 'Assign roles to users' },
    ],
  },
];

// All permission keys flat
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

// ── Adapters ──────────────────────────────────────────────────────────────────

function adaptRole(raw: Record<string, unknown>): Role {
  const roleName = String(raw.name ?? raw.role ?? '');
  return {
    id:          String(raw.id ?? raw.role ?? raw.name ?? ''),
    name:        roleName,
    description: String(raw.description ?? ''),
    permissions: Array.isArray(raw.permissions) ? (raw.permissions as string[]) : [],
    createdAt:   String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
  };
}

// ── Seed data (offline fallback) ──────────────────────────────────────────────

export const SEED_ROLES: Role[] = [
  {
    id: 'ROLE-001',
    name: 'Campaign Manager',
    description: 'Can manage campaigns and view reports.',
    permissions: ['campaigns:read', 'campaigns:create', 'campaigns:dispatch', 'campaigns:cancel', 'reports:read', 'templates:read'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ROLE-002',
    name: 'Analyst',
    description: 'Read-only access to reports and risk scores.',
    permissions: ['reports:read', 'reports:export', 'risk-scores:read', 'employees:read'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ROLE-003',
    name: 'HR Admin',
    description: 'Manage employees and training.',
    permissions: ['employees:read', 'employees:create', 'employees:update', 'employees:import', 'training:read', 'training:create', 'training:complete'],
    createdAt: new Date().toISOString(),
  },
];

// ── API functions ─────────────────────────────────────────────────────────────

/** List all roles — GET /api/admin/roles */
export async function listRoles(): Promise<Role[]> {
  try {
    const tenantId = useAuthStore.getState().orgId ?? 'org-1';
    const raw = await apiClient.get<unknown[]>('/api/admin/roles', getAdminToken, { 'x-tenant-id': tenantId });
    if (!Array.isArray(raw)) return SEED_ROLES;
    return raw.map((r) => adaptRole(r as Record<string, unknown>));
  } catch {
    return SEED_ROLES;
  }
}

/** Create a role — POST /api/admin/roles */
export async function createRole(values: RoleFormValues): Promise<Role> {
  try {
    const tenantId = useAuthStore.getState().orgId ?? 'org-1';
    const raw = await apiClient.post<Record<string, unknown>>(
      '/api/admin/roles',
      getAdminToken,
      { orgId: tenantId, role: values.name, permissions: values.permissions },
      { 'x-tenant-id': tenantId },
    );
    return adaptRole(raw);
  } catch {
    return { ...values, id: `ROLE-${Date.now()}`, createdAt: new Date().toISOString() };
  }
}

/** Update a role and its permission set — PATCH /api/admin/roles/:id */
export async function updateRole(id: string, values: RoleFormValues): Promise<Role> {
  if (!id.trim()) throw new Error('Cannot update a role without an identifier.');
  const tenantId = useAuthStore.getState().orgId ?? 'org-1';
  const raw = await apiClient.patch<Record<string, unknown>>(
    `/api/admin/roles/${encodeURIComponent(id)}`,
    getAdminToken,
    { orgId: tenantId, role: values.name, permissions: values.permissions },
    { 'x-tenant-id': tenantId },
  );
  return adaptRole(raw);
}

/** Delete a role — DELETE /api/admin/roles/:id */
export async function deleteRole(id: string): Promise<void> {
  if (!id.trim()) throw new Error('Cannot delete a role without an identifier.');
  const tenantId = useAuthStore.getState().orgId ?? 'org-1';
  await apiClient.delete(
    `/api/admin/roles/${encodeURIComponent(id)}`,
    getAdminToken,
    { 'x-tenant-id': tenantId },
  );
}

/**
 * Assign a role to an org user — PATCH /api/admin/users/:userId
 * The backend updates the user's role field via the existing user-update endpoint.
 */
export async function assignRole(assignment: RoleAssignment): Promise<void> {
  const tenantId = useAuthStore.getState().orgId ?? 'org-1';
  const userId = assignment.userId.includes('@')
    ? (await listOrgUsers()).find((user) => user.email.toLowerCase() === assignment.userId.toLowerCase())?.id
    : assignment.userId;

  if (!userId) throw new Error('Organisation user was not found');

  await apiClient.patch<unknown>(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    getAdminToken,
    { role: assignment.roleName },
    { 'x-tenant-id': tenantId },
  );
}
