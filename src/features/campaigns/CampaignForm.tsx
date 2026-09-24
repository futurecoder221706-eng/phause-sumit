import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { createCampaignSchema } from '../../schemas/campaign.schema';
import type { CampaignTemplate, CreateCampaignInput, TargetMode } from './types';
import { CampaignReview } from './components';

interface Props { templates: CampaignTemplate[]; initial?: Partial<CreateCampaignInput>; submitLabel?: string; onSubmit: (input: CreateCampaignInput) => void; }
const blank: CreateCampaignInput = { name: '', templateId: '', targetMode: 'segment', targetSegment: '', targetSamplePercent: null, staggerWindowMinutes: 0, scheduledAt: null };

export function CampaignForm({ templates, initial, submitLabel = 'Create campaign', onSubmit }: Props) {
  const [form, setForm] = useState<CreateCampaignInput>({ ...blank, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState(false);
  const set = <K extends keyof CreateCampaignInput>(key: K, value: CreateCampaignInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    const result = createCampaignSchema.safeParse(form);
    if (result.success) { setErrors({}); return result.data; }
    const fieldErrors: Record<string, string> = {};
    result.error.issues.forEach((issue) => { const key = String(issue.path[0]); if (!fieldErrors[key]) fieldErrors[key] = issue.message; });
    setErrors(fieldErrors); return null;
  };
  const onChangeNumber = (key: 'targetSamplePercent' | 'staggerWindowMinutes', event: ChangeEvent<HTMLInputElement>) => set(key, event.target.value === '' ? (key === 'targetSamplePercent' ? null : 0) : Number(event.target.value));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = validate();
    if (!parsed) return;
    if (!review) {
      setReview(true);
      return;
    }
    onSubmit(parsed);
  };
  const selectedTemplate = templates.find((template) => template.id === form.templateId);
  const fieldError = (key: string) => errors[key] ? <p className="ax-field__message ax-field__message--error">{errors[key]}</p> : null;

  return <form className="campaign-form" onSubmit={submit} noValidate><div className="ax-dash-grid campaign-form-grid"><section className="ax-card ax-col--8" role="region" aria-label="Campaign form" style={{ minWidth: 0 }}><div className="ax-card__header"><div className="ax-card__titles"><span className="ax-card__eyebrow">Campaign setup</span><h2 className="ax-card__title">Configure campaign</h2></div></div><div className="ax-card__body" style={{ display: 'grid', gap: 'var(--ax-space-4)' }}>
    <div className="ax-field"><label className="ax-label" htmlFor="campaign-name">Campaign name</label><input id="campaign-name" className="ax-input" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Q3 Password Awareness" />{fieldError('name')}</div>
    <div className="ax-field"><label className="ax-label" htmlFor="campaign-template">Phishing template</label><select id="campaign-template" className="ax-select" value={form.templateId} onChange={(event) => set('templateId', event.target.value)}><option value="">Select a template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>{fieldError('templateId')}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--ax-space-3)' }}><div className="ax-field"><label className="ax-label" htmlFor="campaign-target-mode">Target mode</label><select id="campaign-target-mode" className="ax-select" value={form.targetMode} onChange={(event) => set('targetMode', event.target.value as TargetMode)}><option value="all">All matching employees</option><option value="segment">Specific segment</option><option value="percentage">Sample percentage</option></select>{fieldError('targetMode')}</div><div className="ax-field"><label className="ax-label" htmlFor="campaign-target-segment">Target segment</label><input id="campaign-target-segment" className="ax-input" value={form.targetSegment} onChange={(event) => set('targetSegment', event.target.value)} placeholder="Finance or All corporate employees" />{fieldError('targetSegment')}</div></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--ax-space-3)' }}><div className="ax-field"><label className="ax-label" htmlFor="campaign-sample">Target sample percentage <span className="ax-field__hint">Optional</span></label><input id="campaign-sample" className="ax-input" type="number" min={1} max={100} value={form.targetSamplePercent ?? ''} onChange={(event) => onChangeNumber('targetSamplePercent', event)} placeholder="Not set" />{fieldError('targetSamplePercent')}</div><div className="ax-field"><label className="ax-label" htmlFor="campaign-stagger">Stagger window minutes</label><input id="campaign-stagger" className="ax-input" type="number" min={0} value={form.staggerWindowMinutes} onChange={(event) => onChangeNumber('staggerWindowMinutes', event)} />{fieldError('staggerWindowMinutes')}</div></div>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="ax-label">Sending schedule</legend><div className="ax-cluster" style={{ gap: 'var(--ax-space-4)', marginBlockStart: 'var(--ax-space-2)' }}><label className="ax-check"><input type="radio" name="schedule" checked={form.scheduledAt === null} onChange={() => set('scheduledAt', null)} />Send immediately</label><label className="ax-check"><input type="radio" name="schedule" checked={form.scheduledAt !== null} onChange={() => set('scheduledAt', new Date(Date.now() + 86400000).toISOString().slice(0, 16))} />Schedule for later</label></div></fieldset>
    {form.scheduledAt !== null && <div className="ax-field"><label className="ax-label" htmlFor="campaign-scheduled">Schedule date and time</label><input id="campaign-scheduled" className="ax-input" type="datetime-local" value={form.scheduledAt.slice(0, 16)} onChange={(event) => set('scheduledAt', event.target.value || null)} />{fieldError('scheduledAt')}</div>}
  </div><div className="ax-card__footer ax-cluster" style={{ justifyContent: 'flex-end' }}><button type="button" className="ax-btn ax-btn--secondary" onClick={() => { if (validate()) setReview(true); }}>Review campaign</button><button type="submit" className="ax-btn ax-btn--primary">{submitLabel}</button></div></section><div className="ax-col--4" style={{ minWidth: 0 }}>{review ? <CampaignReview input={form} template={selectedTemplate} /> : <section className="ax-card"><div className="ax-card__body"><h2 className="ax-card__title">Before you create</h2><p className="ax-card__subtitle" style={{ marginBlockStart: 'var(--ax-space-2)' }}>Review the target, template, and delivery schedule before saving this campaign.</p></div></section>}</div></div></form>;
}
