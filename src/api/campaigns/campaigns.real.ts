/*
 * Phause — Campaigns API (Steps 8.1–8.6 from the Postman collection).
 *
 * All routes use appToken (Bearer).
 * Endpoints:
 *   GET    /api/campaigns              — list all
 *   GET    /api/campaigns/:id          — get one
 *   POST   /api/campaigns              — create
 *   PATCH  /api/campaigns/:id          — update (draft only)
 *   POST   /api/campaigns/:id/dispatch — dispatch
 *   POST   /api/campaigns/:id/cancel   — cancel
 *   GET    /api/templates              — list templates (needed for campaign form)
 *
 * Falls back to mock data when the API is unreachable.
 */

import { apiClient } from '../client';
import { getAppToken } from '../../stores/auth.store';
import { mockCampaigns, mockCampaignTemplates } from '../../features/campaigns/mocks';
import type { Campaign, CampaignTemplate, CreateCampaignInput, UpdateCampaignInput } from '../../features/campaigns/types';

function adaptCampaign(raw: Record<string, unknown>): Campaign {
  return {
    id:                   String(raw.id ?? ''),
    name:                 String(raw.name ?? ''),
    templateId:           String(raw.templateId ?? raw.template_id ?? ''),
    targeting: {
      targetMode:         (raw.targetMode ?? raw.target_mode ?? 'all') as Campaign['targeting']['targetMode'],
      targetSegment:      String(raw.targetSegment ?? raw.target_segment ?? ''),
      targetSamplePercent: raw.targetSamplePercent != null ? Number(raw.targetSamplePercent) : null,
    },
    staggerWindowMinutes: Number(raw.staggerWindowMinutes ?? raw.stagger_window_minutes ?? 0),
    scheduledAt:          raw.scheduledAt ? String(raw.scheduledAt) : null,
    status:               (raw.status ?? 'draft') as Campaign['status'],
    createdAt:            String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    dispatchedAt:         raw.dispatchedAt ? String(raw.dispatchedAt) : null,
  };
}

function adaptTemplate(raw: Record<string, unknown>): CampaignTemplate {
  return {
    id:      String(raw.id ?? ''),
    name:    String(raw.name ?? ''),
    subject: String(raw.subject ?? ''),
  };
}

export const campaignsApiReal = {
  async list(): Promise<Campaign[]> {
    try {
      const raw = await apiClient.get<unknown[]>('/api/campaigns', getAppToken);
      if (!Array.isArray(raw)) return mockCampaigns;
      return raw.map((r) => adaptCampaign(r as Record<string, unknown>));
    } catch { return mockCampaigns; }
  },

  async getById(id: string): Promise<Campaign | undefined> {
    try {
      const raw = await apiClient.get<Record<string, unknown>>(
        `/api/campaigns/${encodeURIComponent(id)}`, getAppToken,
      );
      return adaptCampaign(raw);
    } catch { return mockCampaigns.find((c) => c.id === id); }
  },

  async create(input: CreateCampaignInput): Promise<Campaign> {
    try {
      const raw = await apiClient.post<Record<string, unknown>>('/api/campaigns', getAppToken, {
        name:                input.name,
        templateId:          input.templateId,
        targetMode:          input.targetMode,
        targetSegment:       input.targetSegment,
        targetSamplePercent: input.targetSamplePercent,
        staggerWindowMinutes: input.staggerWindowMinutes,
        scheduledAt:         input.scheduledAt,
      });
      return adaptCampaign(raw);
    } catch {
      const campaign: Campaign = {
        id: `CMP-${Date.now()}`, name: input.name, templateId: input.templateId,
        targeting: { targetMode: input.targetMode, targetSegment: input.targetSegment, targetSamplePercent: input.targetSamplePercent },
        staggerWindowMinutes: input.staggerWindowMinutes, scheduledAt: input.scheduledAt,
        status: input.scheduledAt ? 'scheduled' : 'draft', createdAt: new Date().toISOString(), dispatchedAt: null,
      };
      return campaign;
    }
  },

  async update(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    try {
      const raw = await apiClient.patch<Record<string, unknown>>(
        `/api/campaigns/${encodeURIComponent(id)}`, getAppToken, input,
      );
      return adaptCampaign(raw);
    } catch {
      const current = mockCampaigns.find((c) => c.id === id);
      if (!current) throw new Error('Campaign not found.');
      return { ...current, ...input, targeting: { ...current.targeting, ...input } } as Campaign;
    }
  },

  async dispatch(id: string): Promise<Campaign> {
    try {
      const raw = await apiClient.post<Record<string, unknown>>(
        `/api/campaigns/${encodeURIComponent(id)}/dispatch`, getAppToken,
      );
      return adaptCampaign(raw);
    } catch {
      return { ...mockCampaigns.find((c) => c.id === id)!, status: 'running', dispatchedAt: new Date().toISOString() };
    }
  },

  async cancel(id: string): Promise<Campaign> {
    try {
      const raw = await apiClient.post<Record<string, unknown>>(
        `/api/campaigns/${encodeURIComponent(id)}/cancel`, getAppToken,
      );
      return adaptCampaign(raw);
    } catch {
      return { ...mockCampaigns.find((c) => c.id === id)!, status: 'cancelled' };
    }
  },

  async listTemplates(): Promise<CampaignTemplate[]> {
    try {
      const raw = await apiClient.get<unknown[]>('/api/templates', getAppToken);
      if (!Array.isArray(raw)) return mockCampaignTemplates;
      return raw.map((r) => adaptTemplate(r as Record<string, unknown>));
    } catch { return mockCampaignTemplates; }
  },
};
