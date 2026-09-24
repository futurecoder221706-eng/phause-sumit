/*
 * Phause — Billing (Extras — Plans & Subscriptions).
 *
 * Covers all 5 Billing endpoints:
 *   POST   /api/billing/plans                 — Create plan
 *   GET    /api/billing/plans                 — List plans (pricing cards)
 *   POST   /api/billing/checkout              — Create Stripe checkout session → redirect
 *   GET    /api/billing/subscription          — Current subscription status
 *   POST   /api/billing/subscription/cancel   — Cancel subscription
 */
import { useEffect, useState } from 'react';
import { PageHead } from '../../components/shell/PageHead';
import {
  listBillingPlans,
  createBillingPlan,
  createCheckoutSession,
  getCurrentSubscription,
  cancelSubscription,
  type BillingPlan,
  type Subscription,
  type BillingPlanFormValues,
} from '../../api/billing/billing.api';

// ── icons ─────────────────────────────────────────────────────────────────────
const IC_PLUS   = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
const IC_CLOSE  = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
const IC_CHECK  = <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>;
const IC_STRIPE = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/><path d="M9.5 9.5c0-1.1.9-2 2-2h1.5a2 2 0 0 1 0 4h-1a2 2 0 0 0 0 4H14"/></svg>;
const IC_CANCEL = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>;

// ── Status badge ──────────────────────────────────────────────────────────────
const SUB_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  active:    { bg:'color-mix(in oklch,var(--ax-viz-emerald) 15%,transparent)', fg:'var(--ax-viz-emerald)', label:'Active' },
  trialing:  { bg:'color-mix(in oklch,var(--ax-viz-cyan) 15%,transparent)',    fg:'var(--ax-viz-cyan)',    label:'Trial' },
  past_due:  { bg:'color-mix(in oklch,var(--ax-warning-500) 15%,transparent)', fg:'var(--ax-warning-500)',label:'Past Due' },
  cancelled: { bg:'color-mix(in oklch,var(--ax-danger-500) 12%,transparent)',  fg:'var(--ax-danger-500)', label:'Cancelled' },
  none:      { bg:'var(--ax-surface-subtle)', fg:'var(--ax-text-muted)', label:'No subscription' },
};
function SubStatusBadge({ status }: { status: string }) {
  const s = SUB_STATUS[status] ?? SUB_STATUS.none;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, background:s.bg, color:s.fg, fontSize:'var(--ax-text-sm)', fontWeight:600 }}>
      <i style={{ width:7, height:7, borderRadius:'50%', background:s.fg, flexShrink:0 }} />{s.label}
    </span>
  );
}

// ── Modal: Create Plan ────────────────────────────────────────────────────────
function CreatePlanModal({ onClose, onSave }: { onClose: () => void; onSave: (p: BillingPlan) => void }) {
  const EMPTY: BillingPlanFormValues = {
    name:'', description:'', priceMonthly:0, priceCurrency:'USD',
    features:[], maxEmployees:null, maxCampaigns:null, stripePriceId:'',
  };
  const [form, setForm] = useState<BillingPlanFormValues>(EMPTY);
  const [featInput, setFeatInput] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof BillingPlanFormValues>(k: K, v: BillingPlanFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function addFeature() {
    const t = featInput.trim();
    if (t) { set('features', [...form.features, t]); setFeatInput(''); }
  }
  function removeFeature(i: number) {
    set('features', form.features.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { onSave(await createBillingPlan(form)); }
    finally { setSaving(false); }
  }

  return (
    <div role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'var(--ax-space-4)', background:'rgba(15,18,25,.5)', backdropFilter:'blur(4px)' }}>
      <div className="ax-card" role="dialog" aria-modal="true" aria-labelledby="cp-modal-title"
        style={{ width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto' }}>
        <div className="ax-card__header">
          <div className="ax-card__titles"><h2 className="ax-card__title" id="cp-modal-title">Create Billing Plan</h2></div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onClose}>{IC_CLOSE}</button>
        </div>
        <form onSubmit={submit}>
          <div className="ax-card__body" style={{ display:'grid', gap:'var(--ax-space-4)' }}>
            <div className="ax-field">
              <label className="ax-label" htmlFor="cp-name">Plan name</label>
              <input id="cp-name" className="ax-input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="cp-desc">Description</label>
              <textarea id="cp-desc" className="ax-input" rows={2} value={form.description}
                onChange={(e) => set('description', e.target.value)} style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--ax-space-3)' }}>
              <div className="ax-field">
                <label className="ax-label" htmlFor="cp-price">Monthly price</label>
                <input id="cp-price" className="ax-input" type="number" min={0} step={0.01} value={form.priceMonthly}
                  onChange={(e) => set('priceMonthly', Number(e.target.value))} required />
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor="cp-currency">Currency</label>
                <select id="cp-currency" className="ax-select" value={form.priceCurrency}
                  onChange={(e) => set('priceCurrency', e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--ax-space-3)' }}>
              <div className="ax-field">
                <label className="ax-label" htmlFor="cp-emp">Max employees (blank = unlimited)</label>
                <input id="cp-emp" className="ax-input" type="number" min={1} placeholder="Unlimited"
                  value={form.maxEmployees ?? ''} onChange={(e) => set('maxEmployees', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor="cp-camp">Max campaigns (blank = unlimited)</label>
                <input id="cp-camp" className="ax-input" type="number" min={1} placeholder="Unlimited"
                  value={form.maxCampaigns ?? ''} onChange={(e) => set('maxCampaigns', e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="cp-price-id">Stripe price ID</label>
              <input id="cp-price-id" className="ax-input" placeholder="price_..." value={form.stripePriceId}
                onChange={(e) => set('stripePriceId', e.target.value)} />
            </div>
            {/* features list */}
            <div className="ax-field">
              <label className="ax-label">Features</label>
              <div className="ax-cluster" style={{ gap:'var(--ax-space-2)', marginBottom:'var(--ax-space-2)', flexWrap:'wrap' }}>
                {form.features.map((f, i) => (
                  <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, background:'var(--ax-surface-subtle)', fontSize:'var(--ax-text-xs)' }}>
                    {f}
                    <button type="button" style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:'var(--ax-text-subtle)', lineHeight:1 }} onClick={() => removeFeature(i)} aria-label={`Remove ${f}`}>×</button>
                  </span>
                ))}
              </div>
              <div className="ax-cluster" style={{ gap:'var(--ax-space-2)' }}>
                <input className="ax-input" placeholder="Add feature…" value={featInput}
                  onChange={(e) => setFeatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  style={{ flex:1 }} />
                <button type="button" className="ax-btn ax-btn--secondary" onClick={addFeature}>Add</button>
              </div>
            </div>
          </div>
          <div className="ax-card__footer ax-cluster" style={{ justifyContent:'flex-end', gap:'var(--ax-space-3)' }}>
            <button type="button" className="ax-btn ax-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className={`ax-btn ax-btn--primary${saving ? ' is-loading':''}`} aria-busy={saving}>
              <span className="ax-btn__spinner" aria-hidden="true" />
              <span className="ax-btn__label">Create plan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({
  plan, isCurrent, onCheckout, checkingOut,
}: {
  plan: BillingPlan;
  isCurrent: boolean;
  onCheckout: (plan: BillingPlan) => void;
  checkingOut: string | null;
}) {
  const highlighted = plan.name === 'Professional';
  return (
    <div
      className="ax-card"
      style={{
        position:'relative', display:'flex', flexDirection:'column',
        border: isCurrent ? '2px solid var(--ax-accent)' : highlighted ? '2px solid var(--ax-accent)' : undefined,
      }}
    >
      {isCurrent && (
        <span style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'var(--ax-accent)', color:'var(--ax-on-accent)', fontSize:'var(--ax-text-xs)', fontWeight:700, padding:'2px 10px', borderRadius:99, whiteSpace:'nowrap' }}>
          Current plan
        </span>
      )}
      {!isCurrent && highlighted && (
        <span style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'var(--ax-accent)', color:'var(--ax-on-accent)', fontSize:'var(--ax-text-xs)', fontWeight:700, padding:'2px 10px', borderRadius:99, whiteSpace:'nowrap' }}>
          Most popular
        </span>
      )}
      <div className="ax-card__body" style={{ flex:1, display:'flex', flexDirection:'column', gap:'var(--ax-space-4)' }}>
        <div>
          <h3 style={{ margin:0, fontSize:'var(--ax-text-xl)', fontWeight:'var(--ax-weight-semibold)', color:'var(--ax-text-strong)' }}>{plan.name}</h3>
          <p style={{ margin:'4px 0 0', fontSize:'var(--ax-text-sm)', color:'var(--ax-text-muted)' }}>{plan.description}</p>
        </div>
        <div style={{ display:'flex', alignItems:'baseline', gap:'var(--ax-space-1)' }}>
          <span style={{ fontSize:'var(--ax-text-3xl)', fontWeight:'var(--ax-weight-bold)', color:'var(--ax-text-strong)', fontVariantNumeric:'tabular-nums' }}>
            {plan.priceCurrency === 'USD' ? '$' : plan.priceCurrency === 'EUR' ? '€' : plan.priceCurrency === 'GBP' ? '£' : ''}{plan.priceMonthly}
          </span>
          <span style={{ fontSize:'var(--ax-text-sm)', color:'var(--ax-text-muted)' }}>/ month</span>
        </div>
        <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:'var(--ax-space-2)', flex:1 }}>
          {plan.features.map((f) => (
            <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'var(--ax-space-2)', fontSize:'var(--ax-text-sm)', color:'var(--ax-text)' }}>
              <span style={{ color:'var(--ax-viz-emerald)', flexShrink:0, marginTop:2 }}>{IC_CHECK}</span>
              {f}
            </li>
          ))}
          {plan.maxEmployees !== null && (
            <li style={{ display:'flex', alignItems:'flex-start', gap:'var(--ax-space-2)', fontSize:'var(--ax-text-sm)', color:'var(--ax-text-subtle)' }}>
              <span style={{ color:'var(--ax-text-subtle)', flexShrink:0, marginTop:2 }}>{IC_CHECK}</span>
              Up to {plan.maxEmployees.toLocaleString()} employees
            </li>
          )}
          {plan.maxCampaigns !== null && (
            <li style={{ display:'flex', alignItems:'flex-start', gap:'var(--ax-space-2)', fontSize:'var(--ax-text-sm)', color:'var(--ax-text-subtle)' }}>
              <span style={{ color:'var(--ax-text-subtle)', flexShrink:0, marginTop:2 }}>{IC_CHECK}</span>
              {plan.maxCampaigns} campaigns/month
            </li>
          )}
        </ul>
        <button
          type="button"
          disabled={isCurrent || checkingOut !== null}
          className={`ax-btn ax-btn--block${isCurrent ? ' ax-btn--secondary' : ' ax-btn--primary'}${checkingOut === plan.id ? ' is-loading' : ''}`}
          aria-busy={checkingOut === plan.id}
          onClick={() => !isCurrent && onCheckout(plan)}
        >
          <span className="ax-btn__spinner" aria-hidden="true" />
          {IC_STRIPE}
          <span className="ax-btn__label">{isCurrent ? 'Current plan' : 'Subscribe'}</span>
        </button>
      </div>
    </div>
  );
}

// ── Subscription status card ──────────────────────────────────────────────────
function SubscriptionCard({ sub, onCancel, cancelling }: {
  sub: Subscription;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });

  return (
    <div className="ax-card ax-card--filled">
      <div className="ax-card__header">
        <div className="ax-card__titles">
          <h2 className="ax-card__title">Current Subscription</h2>
        </div>
        <SubStatusBadge status={sub.status} />
      </div>
      <div className="ax-card__body" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'var(--ax-space-5)' }}>
        <div>
          <p style={{ margin:0, fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)', textTransform:'uppercase', letterSpacing:'.05em' }}>Plan</p>
          <p style={{ margin:'4px 0 0', fontWeight:'var(--ax-weight-semibold)', color:'var(--ax-text-strong)' }}>{sub.planName || sub.planId}</p>
        </div>
        <div>
          <p style={{ margin:0, fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)', textTransform:'uppercase', letterSpacing:'.05em' }}>Period start</p>
          <p style={{ margin:'4px 0 0', color:'var(--ax-text)' }}>{fmt(sub.currentPeriodStart)}</p>
        </div>
        <div>
          <p style={{ margin:0, fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)', textTransform:'uppercase', letterSpacing:'.05em' }}>Period end</p>
          <p style={{ margin:'4px 0 0', color:'var(--ax-text)' }}>{fmt(sub.currentPeriodEnd)}</p>
        </div>
        {sub.stripeSubscriptionId && (
          <div>
            <p style={{ margin:0, fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)', textTransform:'uppercase', letterSpacing:'.05em' }}>Stripe ID</p>
            <p style={{ margin:'4px 0 0', fontFamily:'var(--ax-font-mono)', fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)' }}>{sub.stripeSubscriptionId}</p>
          </div>
        )}
      </div>
      {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
        <div className="ax-card__footer ax-cluster" style={{ justifyContent:'flex-end' }}>
          <button
            type="button"
            className={`ax-btn ax-btn--danger ax-btn--ghost${cancelling ? ' is-loading' : ''}`}
            aria-busy={cancelling}
            onClick={onCancel}
          >
            <span className="ax-btn__spinner" aria-hidden="true" />
            {IC_CANCEL}
            <span className="ax-btn__label">Cancel subscription</span>
          </button>
        </div>
      )}
      {sub.cancelAtPeriodEnd && (
        <div className="ax-card__footer">
          <p style={{ margin:0, fontSize:'var(--ax-text-sm)', color:'var(--ax-warning-500)' }}>
            ⚠ Your subscription will cancel at the end of the current billing period ({fmt(sub.currentPeriodEnd)}).
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function Billing() {
  const [plans, setPlans]           = useState<BillingPlan[]>([]);
  const [sub, setSub]               = useState<Subscription | null>(null);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [cancelling, setCancelling]   = useState(false);
  const [toast, setToast]             = useState('');

  useEffect(() => {
    Promise.all([listBillingPlans(), getCurrentSubscription()]).then(([p, s]) => {
      setPlans(p);
      setSub(s);
      setLoading(false);
    });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  function onPlanCreated(p: BillingPlan) {
    setPlans((prev) => [...prev, p]);
    setShowCreate(false);
    showToast(`Plan "${p.name}" created successfully.`);
  }

  async function handleCheckout(plan: BillingPlan) {
    setCheckingOut(plan.id);
    try {
      const session = await createCheckoutSession(plan.id);
      if (session.url) {
        window.location.href = session.url;
      } else {
        showToast('Checkout session created. No redirect URL returned — check Stripe config.');
      }
    } catch {
      showToast('Failed to create checkout session. Please try again.');
    } finally {
      setCheckingOut(null);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.')) return;
    setCancelling(true);
    try {
      const updated = await cancelSubscription();
      setSub(updated);
      showToast('Subscription cancellation scheduled at period end.');
    } catch {
      showToast('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  const currentPlanId = sub?.status !== 'cancelled' && sub?.status !== 'none' ? sub?.planId : null;

  return (
    <>
      {showCreate && <CreatePlanModal onClose={() => setShowCreate(false)} onSave={onPlanCreated} />}

      {/* toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ position:'fixed', bottom:'var(--ax-space-6)', right:'var(--ax-space-6)', zIndex:2000, background:'var(--ax-surface-raised)', border:'1px solid var(--ax-border)', borderRadius:'var(--ax-radius-lg)', padding:'var(--ax-space-3) var(--ax-space-5)', boxShadow:'var(--ax-shadow-lg)', fontSize:'var(--ax-text-sm)', color:'var(--ax-text-strong)' }}>
          {toast}
        </div>
      )}

      <PageHead
        title="Billing & Plans"
        subtitle="Manage your subscription and available billing plans."
        actions={
          <button type="button" className="ax-btn ax-btn--secondary" onClick={() => setShowCreate(true)}>
            {IC_PLUS}<span className="ax-btn__label">Create Plan</span>
          </button>
        }
      />

      {/* ── Subscription status ────────────────────────────────────────── */}
      {loading ? (
        <div className="ax-skeleton" style={{ width:'100%', height:120, borderRadius:'var(--ax-radius-xl)', marginBottom:'var(--ax-space-6)' }} />
      ) : sub ? (
        <div style={{ marginBottom:'var(--ax-space-6)' }}>
          <SubscriptionCard sub={sub} onCancel={handleCancel} cancelling={cancelling} />
        </div>
      ) : null}

      {/* ── Plans grid ────────────────────────────────────────────────── */}
      <div style={{ marginBottom:'var(--ax-space-4)' }}>
        <h2 style={{ margin:0, fontSize:'var(--ax-text-xl)', fontWeight:'var(--ax-weight-semibold)', color:'var(--ax-text-strong)' }}>Available Plans</h2>
        <p style={{ margin:'4px 0 0', fontSize:'var(--ax-text-sm)', color:'var(--ax-text-muted)' }}>
          Choose the plan that fits your organisation. Clicking Subscribe opens Stripe Checkout.
        </p>
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'var(--ax-space-5)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ax-skeleton" style={{ height:320, borderRadius:'var(--ax-radius-xl)' }} />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="ax-card">
          <div className="ax-card__body" style={{ textAlign:'center', padding:'var(--ax-space-10)', color:'var(--ax-text-subtle)' }}>
            No plans yet — click <strong>Create Plan</strong> to add one.
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'var(--ax-space-5)', paddingTop:'var(--ax-space-4)' }}>
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              isCurrent={p.id === currentPlanId}
              onCheckout={handleCheckout}
              checkingOut={checkingOut}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default Billing;
