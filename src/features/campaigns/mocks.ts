import type { Campaign, CampaignTemplate } from './types';

export const mockCampaignTemplates: CampaignTemplate[] = [
  { id: 'TPL-1001', name: 'Urgent IT Password Reset', subject: '[ACTION REQUIRED] Your password will expire in 24 hours' },
  { id: 'TPL-1002', name: 'Finance Invoice Review', subject: 'Invoice approval needed before close of business' },
  { id: 'TPL-1003', name: 'Security Alert Verification', subject: 'New sign-in detected on your account' },
];

export const mockCampaigns: Campaign[] = [
  {
    id: 'CMP-1001', name: 'Q3 Password Awareness', templateId: 'TPL-1001',
    targeting: { targetMode: 'percentage', targetSegment: 'All corporate employees', targetSamplePercent: 35 },
    staggerWindowMinutes: 60, scheduledAt: '2026-09-25T09:00:00.000Z', status: 'scheduled', createdAt: '2026-09-20T10:30:00.000Z', dispatchedAt: null,
  },
  {
    id: 'CMP-1002', name: 'Finance Invoice Drill', templateId: 'TPL-1002',
    targeting: { targetMode: 'segment', targetSegment: 'Finance', targetSamplePercent: null },
    staggerWindowMinutes: 30, scheduledAt: null, status: 'running', createdAt: '2026-09-18T08:15:00.000Z', dispatchedAt: '2026-09-18T09:00:00.000Z',
  },
  {
    id: 'CMP-1003', name: 'Security Team Baseline', templateId: 'TPL-1003',
    targeting: { targetMode: 'all', targetSegment: 'Security and IT', targetSamplePercent: null },
    staggerWindowMinutes: 0, scheduledAt: null, status: 'completed', createdAt: '2026-09-10T12:00:00.000Z', dispatchedAt: '2026-09-11T09:00:00.000Z',
  },
  {
    id: 'CMP-1004', name: 'Cancelled Supplier Test', templateId: 'TPL-1002',
    targeting: { targetMode: 'segment', targetSegment: 'Procurement', targetSamplePercent: 20 },
    staggerWindowMinutes: 15, scheduledAt: '2026-09-22T14:00:00.000Z', status: 'cancelled', createdAt: '2026-09-15T15:00:00.000Z', dispatchedAt: null,
  },
  {
    id: 'CMP-1005', name: 'Draft New Joiner Test', templateId: 'TPL-1003',
    targeting: { targetMode: 'segment', targetSegment: 'New joiners', targetSamplePercent: null },
    staggerWindowMinutes: 10, scheduledAt: null, status: 'draft', createdAt: '2026-09-21T11:00:00.000Z', dispatchedAt: null,
  },
];
