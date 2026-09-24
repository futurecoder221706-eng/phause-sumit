import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { PageHead } from '../../components/shell/PageHead';
import { CampaignForm } from '../../features/campaigns/CampaignForm';
import { CampaignStatusBadge, ConfirmDialog } from '../../features/campaigns/components';
import { useCampaignStore } from '../../stores/campaign.store';

export function CampaignDetails() {
  const { campaignId } = useParams();
  const location = useLocation();
  const { campaigns, templates, load, getCampaign, updateCampaign, dispatchCampaign, cancelCampaign } = useCampaignStore();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'dispatch' | 'cancel' | null>(null);
  const [notice, setNotice] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);
  const campaign = campaignId ? getCampaign(campaignId) : undefined;

  useEffect(() => { if (!campaigns.length) void load(); }, [campaigns.length, load]);
  useEffect(() => { if (notice) window.history.replaceState({}, document.title); }, [notice]);

  if (!campaign) return <><PageHead title="Campaign details" subtitle="Loading campaign…" /><p style={{ color: 'var(--ax-text-muted)' }}>The campaign may still be loading or may no longer exist.</p></>;
  const template = templates.find((item) => item.id === campaign.templateId);
  const canEdit = campaign.status === 'draft' || campaign.status === 'scheduled';
  const canDispatch = canEdit;
  const canCancel = campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'running';
  const performDispatch = async () => { await dispatchCampaign(campaign.id); setConfirm(null); setNotice('Campaign dispatch simulated.'); };
  const performCancel = async () => { await cancelCampaign(campaign.id); setConfirm(null); setNotice('Campaign cancellation simulated.'); };

  return <>
    <PageHead title={campaign.name} subtitle={`Campaign ${campaign.id}`} actions={<><Link className="ax-btn ax-btn--ghost" to={`/api/campaigns/${campaign.id}/tracking-events`}><span className="ax-btn__label">Tracking Events</span></Link><Link className="ax-btn ax-btn--secondary" to="/api/campaigns">Back to campaigns</Link></>} />
    {notice && <div className="ax-toast-region ax-toast-region--top-end" role="status" aria-live="polite"><div className="ax-toast ax-toast--success"><svg className="ax-toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l4 4L19 6" /></svg><div className="ax-toast__content"><strong style={{ color: 'var(--ax-text-strong)' }}>{notice}</strong></div><button type="button" className="ax-toast__dismiss" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></div></div>}
    {editing ? <CampaignForm templates={templates} initial={{ name: campaign.name, templateId: campaign.templateId, ...campaign.targeting, staggerWindowMinutes: campaign.staggerWindowMinutes, scheduledAt: campaign.scheduledAt }} submitLabel="Save campaign" onSubmit={async (input) => { await updateCampaign(campaign.id, input); setEditing(false); setNotice('Campaign updated successfully.'); }} /> : <div className="ax-dash-grid"><section className="ax-card ax-col--8" role="region" aria-label="Campaign information"><div className="ax-card__header"><div className="ax-card__titles"><span className="ax-card__eyebrow">Campaign status</span><h2 className="ax-card__title">{campaign.name}</h2><p className="ax-card__subtitle">{template?.name ?? campaign.templateId}</p></div><CampaignStatusBadge status={campaign.status} /></div><dl className="ax-card__body" style={{ display: 'grid', gap: 'var(--ax-space-4)', margin: 0 }}>{[['Template subject', template?.subject ?? '—'], ['Target mode', campaign.targeting.targetMode], ['Target segment', campaign.targeting.targetSegment], ['Sample percentage', campaign.targeting.targetSamplePercent === null ? 'Not set' : `${campaign.targeting.targetSamplePercent}%`], ['Stagger window', `${campaign.staggerWindowMinutes} minutes`], ['Scheduled for', campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : 'Immediate'], ['Dispatched at', campaign.dispatchedAt ? new Date(campaign.dispatchedAt).toLocaleString() : 'Not dispatched']].map(([label, value]) => <div key={label} className="ax-cluster" style={{ justifyContent: 'space-between', gap: 'var(--ax-space-4)' }}><dt style={{ color: 'var(--ax-text-muted)' }}>{label}</dt><dd style={{ margin: 0, color: 'var(--ax-text-strong)' }}>{value}</dd></div>)}</dl></section><section className="ax-card ax-col--4" role="region" aria-label="Campaign actions"><div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Actions</h2><p className="ax-card__subtitle">Available for the current lifecycle state.</p></div></div><div className="ax-card__body" style={{ display: 'grid', gap: 'var(--ax-space-3)' }}>{canEdit && <button type="button" className="ax-btn ax-btn--secondary ax-btn--block" onClick={() => setEditing(true)}>Edit campaign</button>}{canDispatch && <button type="button" className="ax-btn ax-btn--primary ax-btn--block" onClick={() => setConfirm('dispatch')}>Dispatch campaign</button>}{canCancel && <button type="button" className="ax-btn ax-btn--danger ax-btn--block" onClick={() => setConfirm('cancel')}>Cancel campaign</button>}</div></section></div>}
    {confirm === 'dispatch' && <ConfirmDialog title="Dispatch campaign?" body="This will simulate sending the campaign and move it to Running." confirmLabel="Dispatch" onCancel={() => setConfirm(null)} onConfirm={() => void performDispatch()} />}
    {confirm === 'cancel' && <ConfirmDialog title="Cancel campaign?" body="This will simulate stopping the campaign. This action cannot be undone." confirmLabel="Cancel campaign" onCancel={() => setConfirm(null)} onConfirm={() => void performCancel()} />}
  </>;
}

export default CampaignDetails;
