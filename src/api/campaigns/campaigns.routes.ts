/**
 * Relative Campaign API paths for the future authenticated adapter.
 * The API client base URL owns the host; these paths intentionally include /api.
 */
export const campaignRoutes = {
  collection: '/api/campaigns',
  list: (templateId?: string) => {
    if (!templateId) return '/api/campaigns';
    const query = new URLSearchParams({ templateId });
    return `/api/campaigns?${query.toString()}`;
  },
  details: (campaignId: string) => `/api/campaigns/${encodeURIComponent(campaignId)}`,
  dispatch: (campaignId: string) => `/api/campaigns/${encodeURIComponent(campaignId)}/dispatch`,
  cancel: (campaignId: string) => `/api/campaigns/${encodeURIComponent(campaignId)}/cancel`,
  update: (campaignId: string) => `/api/campaigns/${encodeURIComponent(campaignId)}`,
} as const;
