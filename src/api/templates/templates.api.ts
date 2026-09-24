/*
 * Phause — Templates API (Steps 7.1–7.4 from the Postman collection).
 *
 * All routes use appToken (Bearer).
 * Endpoints:
 *   GET    /api/templates          — list all
 *   GET    /api/templates/:id      — get one
 *   POST   /api/templates          — create
 *   PATCH  /api/templates/:id      — update (not in Postman but standard REST)
 *   DELETE /api/templates/:id      — delete
 */

import { apiClient } from '../client';
import { getAppToken } from '../../stores/auth.store';
import type { PhishingTemplate } from '../../pages/templates/Templates';

function adapt(raw: Record<string, unknown>): PhishingTemplate {
  return {
    id:                 String(raw.id ?? ''),
    name:               String(raw.name ?? ''),
    subject:            String(raw.subject ?? ''),
    htmlBody:           String(raw.htmlBody ?? raw.html_body ?? raw.body ?? ''),
    textBody:           String(raw.textBody ?? raw.text_body ?? ''),
    lureType:           (raw.lureType ?? raw.lure_type ?? 'urgency') as PhishingTemplate['lureType'],
    category:           (raw.category ?? 'credential-harvest') as PhishingTemplate['category'],
    difficulty:         (raw.difficulty ?? 'medium') as PhishingTemplate['difficulty'],
    disclaimerEnabled:  Boolean(raw.disclaimerEnabled ?? raw.disclaimer_enabled ?? false),
  };
}

export async function listTemplates(): Promise<PhishingTemplate[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/templates', getAppToken);
    if (!Array.isArray(raw)) return [];
    return raw.map((r) => adapt(r as Record<string, unknown>));
  } catch { return []; }
}

export async function createTemplate(values: Omit<PhishingTemplate, 'id'>): Promise<PhishingTemplate> {
  const raw = await apiClient.post<Record<string, unknown>>('/api/templates', getAppToken, values);
  return adapt(raw);
}

export async function updateTemplate(id: string, values: Omit<PhishingTemplate, 'id'>): Promise<PhishingTemplate> {
  const raw = await apiClient.patch<Record<string, unknown>>(
    `/api/templates/${encodeURIComponent(id)}`, getAppToken, values,
  );
  return adapt(raw);
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete<void>(`/api/templates/${encodeURIComponent(id)}`, getAppToken);
}
