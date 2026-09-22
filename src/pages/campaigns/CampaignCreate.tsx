import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../components/shell/PageHead';
import { CampaignForm } from '../../features/campaigns/CampaignForm';
import { useCampaignStore } from '../../stores/campaign.store';
import type { CreateCampaignInput } from '../../features/campaigns/types';

export function CampaignCreate() {
  const navigate = useNavigate();
  const { templates, load, createCampaign } = useCampaignStore();
  useEffect(() => { if (!templates.length) void load(); }, [templates.length, load]);
  const submit = async (input: CreateCampaignInput) => {
    const campaign = await createCampaign(input);
    navigate(`/api/campaigns/${campaign.id}`, { replace: true, state: { notice: 'Campaign created successfully.' } });
  };
  return <><PageHead title="Create Campaign" subtitle="Configure a phishing simulation before it enters the campaign lifecycle." /><CampaignForm templates={templates} onSubmit={submit} /></>;
}

export default CampaignCreate;
