import { create } from 'zustand';
import { campaignsApiReal as campaignsApi } from '../api/campaigns/campaigns.real';
import type { Campaign, CreateCampaignInput, CampaignTemplate, UpdateCampaignInput } from '../features/campaigns/types';

interface CampaignState {
  campaigns: Campaign[];
  templates: CampaignTemplate[];
  isLoading: boolean;
  load: () => Promise<void>;
  createCampaign: (input: CreateCampaignInput) => Promise<Campaign>;
  updateCampaign: (id: string, input: UpdateCampaignInput) => Promise<Campaign>;
  dispatchCampaign: (id: string) => Promise<Campaign>;
  cancelCampaign: (id: string) => Promise<Campaign>;
  getCampaign: (id: string) => Campaign | undefined;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  templates: [],
  isLoading: false,
  load: async () => {
    set({ isLoading: true });
    const [campaigns, templates] = await Promise.all([campaignsApi.list(), campaignsApi.listTemplates()]);
    set({ campaigns, templates, isLoading: false });
  },
  createCampaign: async (input) => {
    const campaign = await campaignsApi.create(input);
    set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
    return campaign;
  },
  updateCampaign: async (id, input) => {
    const campaign = await campaignsApi.update(id, input);
    set((state) => ({ campaigns: state.campaigns.map((item) => item.id === id ? campaign : item) }));
    return campaign;
  },
  dispatchCampaign: async (id) => {
    const campaign = await campaignsApi.dispatch(id);
    set((state) => ({ campaigns: state.campaigns.map((item) => item.id === id ? campaign : item) }));
    return campaign;
  },
  cancelCampaign: async (id) => {
    const campaign = await campaignsApi.cancel(id);
    set((state) => ({ campaigns: state.campaigns.map((item) => item.id === id ? campaign : item) }));
    return campaign;
  },
  getCampaign: (id) => get().campaigns.find((campaign) => campaign.id === id),
}));
