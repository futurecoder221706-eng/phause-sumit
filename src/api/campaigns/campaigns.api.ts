import { mockCampaignTemplates, mockCampaigns } from '../../features/campaigns/mocks';
import type { Campaign, CampaignTemplate, CreateCampaignInput, UpdateCampaignInput } from '../../features/campaigns/types';

let campaigns = [...mockCampaigns];

const delay = async <T,>(value: T): Promise<T> => value;

export const campaignsApi = {
  async list(filters?: { templateId?: string }): Promise<Campaign[]> {
    const filtered = filters?.templateId ? campaigns.filter((campaign) => campaign.templateId === filters.templateId) : campaigns;
    return delay(filtered.map((campaign) => ({ ...campaign, targeting: { ...campaign.targeting } })));
  },
  async getById(id: string): Promise<Campaign | undefined> {
    const campaign = campaigns.find((item) => item.id === id);
    return delay(campaign ? { ...campaign, targeting: { ...campaign.targeting } } : undefined);
  },
  async create(input: CreateCampaignInput): Promise<Campaign> {
    const campaign: Campaign = { id: `CMP-${Date.now()}`, name: input.name, templateId: input.templateId, targeting: { targetMode: input.targetMode, targetSegment: input.targetSegment, targetSamplePercent: input.targetSamplePercent }, staggerWindowMinutes: input.staggerWindowMinutes, scheduledAt: input.scheduledAt, status: input.scheduledAt ? 'scheduled' : 'draft', createdAt: new Date().toISOString(), dispatchedAt: null };
    campaigns = [campaign, ...campaigns];
    return delay(campaign);
  },
  async update(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    const current = campaigns.find((campaign) => campaign.id === id);
    if (!current) throw new Error('Campaign not found.');
    const next: Campaign = { ...current, ...input, targeting: { targetMode: input.targetMode ?? current.targeting.targetMode, targetSegment: input.targetSegment ?? current.targeting.targetSegment, targetSamplePercent: input.targetSamplePercent === undefined ? current.targeting.targetSamplePercent : input.targetSamplePercent } };
    if (input.scheduledAt !== undefined) next.scheduledAt = input.scheduledAt;
    campaigns = campaigns.map((campaign) => campaign.id === id ? next : campaign);
    return delay(next);
  },
  async getStatus(id: string): Promise<Campaign['status']> {
    const campaign = campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error('Campaign not found.');
    return delay(campaign.status);
  },
  async dispatch(id: string): Promise<Campaign> {
    const campaign = campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error('Campaign not found.');
    const next = { ...campaign, status: 'running' as const, dispatchedAt: new Date().toISOString() };
    campaigns = campaigns.map((item) => item.id === id ? next : item);
    return delay(next);
  },
  async cancel(id: string): Promise<Campaign> {
    const campaign = campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error('Campaign not found.');
    const next = { ...campaign, status: 'cancelled' as const };
    campaigns = campaigns.map((item) => item.id === id ? next : item);
    return delay(next);
  },
  async listTemplates(): Promise<CampaignTemplate[]> {
    return delay([...mockCampaignTemplates]);
  },
};
