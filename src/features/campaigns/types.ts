export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
export type TargetMode = 'all' | 'segment' | 'percentage';

export interface CampaignTemplate {
  id: string;
  name: string;
  subject: string;
}

export interface CampaignTargeting {
  targetMode: TargetMode;
  targetSegment: string;
  targetSamplePercent: number | null;
}

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  targeting: CampaignTargeting;
  staggerWindowMinutes: number;
  scheduledAt: string | null;
  status: CampaignStatus;
  createdAt: string;
  dispatchedAt: string | null;
}

export interface CreateCampaignInput {
  name: string;
  templateId: string;
  targetMode: TargetMode;
  targetSegment: string;
  targetSamplePercent: number | null;
  staggerWindowMinutes: number;
  scheduledAt: string | null;
}

export type UpdateCampaignInput = Partial<CreateCampaignInput>;
