import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../components/shell/PageHead';
import { useCampaignStore } from '../../stores/campaign.store';
import type { CampaignStatus } from '../../features/campaigns/types';
import { CampaignFilters, CampaignTable } from '../../features/campaigns/components';

export function CampaignList() {
  const navigate = useNavigate();
  const { campaigns, templates, load, isLoading } = useCampaignStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CampaignStatus | 'all'>('all');
  const [templateId, setTemplateId] = useState('all');

  useEffect(() => { if (!campaigns.length) void load(); }, [campaigns.length, load]);

  const filtered = useMemo(() => campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === 'all' || campaign.status === status;
    const matchesTemplate = templateId === 'all' || campaign.templateId === templateId;
    return matchesSearch && matchesStatus && matchesTemplate;
  }), [campaigns, search, status, templateId]);

  return <>
    <PageHead title="Campaigns" subtitle="Plan, review, and control authorised phishing simulations." actions={<button type="button" className="ax-btn ax-btn--primary" onClick={() => navigate('/api/campaigns/new')}>Create Campaign</button>} />
    <CampaignFilters search={search} status={status} templateId={templateId} templates={templates} onSearch={setSearch} onStatus={setStatus} onTemplate={setTemplateId} />
    {isLoading ? <p style={{ color: 'var(--ax-text-muted)' }}>Loading campaigns…</p> : <div className="ax-dash-grid"><CampaignTable campaigns={filtered} templates={templates} onView={(campaign) => navigate(`/api/campaigns/${campaign.id}`)} /></div>}
  </>;
}

export default CampaignList;
