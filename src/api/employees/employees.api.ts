/*
 * Phause — Employees API (Steps 6.1–6.6 from the Postman collection).
 *
 * All routes use appToken (Bearer).
 * Endpoints:
 *   GET    /api/employees              — list all
 *   GET    /api/employees/:id          — get one
 *   POST   /api/employees              — create single
 *   POST   /api/employees/import/csv   — bulk import via CSV string
 *   PATCH  /api/employees/:id          — update
 *   DELETE /api/employees/:id          — soft-deactivate (204)
 */

import { apiClient } from '../client';
import { getAppToken } from '../../stores/auth.store';
import type { EmployeeRecord, EmployeeFormValues } from '../../pages/employees/Employees';

function adapt(raw: Record<string, unknown>): EmployeeRecord {
  return {
    id:             String(raw.id ?? ''),
    organisationId: String(raw.organisationId ?? raw.organizationId ?? raw.orgId ?? ''),
    email:          String(raw.email ?? ''),
    name:           String(raw.name ?? ''),
    department:     String(raw.department ?? ''),
    seniority:      (raw.seniority ?? 'mid') as EmployeeRecord['seniority'],
    hasConsent:     Boolean(raw.hasConsent ?? raw.has_consent ?? true),
  };
}

export async function listEmployees(): Promise<EmployeeRecord[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/employees', getAppToken);
    if (!Array.isArray(raw)) return [];
    return raw.map((r) => adapt(r as Record<string, unknown>));
  } catch { return []; }
}

export async function createEmployee(values: EmployeeFormValues & { organisationId?: string }): Promise<EmployeeRecord> {
  const raw = await apiClient.post<Record<string, unknown>>('/api/employees', getAppToken, {
    email:          values.email,
    name:           values.name,
    department:     values.department,
    seniority:      values.seniority,
    hasConsent:     values.hasConsent,
    organizationId: values.organisationId,
  });
  return adapt(raw);
}

export async function importEmployeesCsv(csv: string): Promise<EmployeeRecord[]> {
  const raw = await apiClient.post<unknown[]>('/api/employees/import/csv', getAppToken, { csv });
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => adapt(r as Record<string, unknown>));
}

export async function updateEmployee(id: string, values: Partial<EmployeeFormValues>): Promise<EmployeeRecord> {
  const raw = await apiClient.patch<Record<string, unknown>>(
    `/api/employees/${encodeURIComponent(id)}`, getAppToken, values,
  );
  return adapt(raw);
}

export async function deleteEmployee(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/employees/${encodeURIComponent(id)}`, getAppToken);
}
