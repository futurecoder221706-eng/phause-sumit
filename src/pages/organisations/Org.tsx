/*
 * Phause — Organisation overview (route "organisations/org").
 *
 * Same shell as OrgUser: an 11-column table (Id, Name, Verified Domains,
 * Plan, Auth Ref, Auth Accept, Auth Signature, Auth At, Region, Disclaimer
 * Enabled, Action), 10-per-page pagination, a running total, and a
 * "Create Organisation" button (top-right) that pops a form as a centered,
 * blurred modal with Cancel. The eye-icon action hands the row to
 * `onViewOrganisation` so the host app can route to the detail page.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead } from '../../components/shell/PageHead';
import { listOrganisations, createOrganisation as createOrganisationApi } from '../../api/organisations/organisations.api';

/* ------------------------------------------------------------------ icons */
const ICON_PLUS = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
);
const ICON_EYE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></svg>
);
const ICON_CLOSE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
);
const ICON_CHEV_LEFT = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg>
);
const ICON_CHEV_RIGHT = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6" /></svg>
);
const ICON_X_SMALL = (
  <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
);

/* ------------------------------------------------------------------- data */
const PLANS = ['6', '12'] as const;

export interface OrganisationRecord {
  id: string;
  name: string;
  verifyDomain: string[];
  plan: '6' | '12';
  authRef: { label: string; url: string };
  authAccept: boolean;
  authSignature: string;
  authAt: string; // ISO timestamp
  region: string;
  disclaimerEnabled: boolean;
}

const PAGE_SIZE = 10;

const REGIONS = ['United States', 'United Kingdom', 'Germany', 'India', 'Canada', 'Australia', 'Singapore', 'Brazil'];

/* Seed data so the table has something to page through; swap for a real fetch. */
function seedOrganisations(count: number): OrganisationRecord[] {
  const out: OrganisationRecord[] = [];
  for (let i = 1; i <= count; i++) {
    const slug = `org${i}`;
    out.push({
      id: `ORG-${String(2000 + i)}`,
      name: `${slug[0].toUpperCase()}${slug.slice(1)} Inc.`,
      verifyDomain: i % 2 === 0 ? [`${slug}.com`, `${slug}.io`] : [`${slug}.com`],
      plan: PLANS[i % PLANS.length],
      authRef: { label: `authorization-${1000 + i}.pdf`, url: `https://docs.example.com/auth/${1000 + i}` },
      authAccept: i % 4 !== 0,
      authSignature: `J. Signer ${i}`,
      authAt: new Date(Date.UTC(2026, i % 12, (i % 27) + 1, 9, 30)).toISOString(),
      region: REGIONS[i % REGIONS.length],
      disclaimerEnabled: i % 3 !== 0,
    });
  }
  return out;
}

// Endpoint now handled by organisations.api.ts

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ---------------------------------------------------------------- modal */
interface CreateOrgFormState {
  name: string;
  verifyDomain: string[];
  region: string;
  disclaimerEnabled: boolean;
  eventRetentionMonths: number;
}

function CreateOrganisationModal({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (values: CreateOrgFormState) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const [region, setRegion] = useState(REGIONS[0]);
  const [disclaimerEnabled, setDisclaimerEnabled] = useState(true);
  const [eventRetentionMonths, setEventRetentionMonths] = useState(12);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const titleId = 'org-modal-title';
  const domainRe = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

  const addDomain = () => {
    const value = domainInput.trim().toLowerCase();
    if (!value) return;
    if (!domainRe.test(value)) { setError('Enter a valid domain, like acme.com.'); return; }
    if (domains.includes(value)) { setDomainInput(''); return; }
    setDomains((d) => [...d, value]);
    setDomainInput('');
    setError('');
  };

  const removeDomain = (value: string) => setDomains((d) => d.filter((x) => x !== value));

  const handleDomainKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addDomain();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (domains.length === 0) { setError('Add at least one verified email domain.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSubmit({ name: name.trim(), verifyDomain: domains, region, disclaimerEnabled, eventRetentionMonths });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--ax-space-4)',
        background: 'rgba(15, 18, 25, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--ax-surface, #fff)',
          borderRadius: 'var(--ax-radius-lg, 12px)',
          border: '1px solid var(--ax-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div className="ax-card__header">
          <div className="ax-card__titles">
            <h2 className="ax-card__title" id={titleId}>Create organisation</h2>
          </div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onCancel}>
            {ICON_CLOSE}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            <div className="ax-field">
              <label className="ax-field__label" htmlFor="co-name">Name</label>
              <input
                id="co-name"
                className="ax-input"
                type="text"
                placeholder="Acme Inc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="ax-field">
              <label className="ax-field__label" htmlFor="co-domain">Verified email domains</label>
              <div className="ax-input-group">
                <input
                  id="co-domain"
                  className="ax-input"
                  type="text"
                  placeholder="acme.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={handleDomainKeyDown}
                />
                <button type="button" className="ax-btn ax-btn--secondary ax-input-group__addon" onClick={addDomain}>
                  Add
                </button>
              </div>
              {domains.length > 0 && (
                <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', marginTop: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
                  {domains.map((d) => (
                    <span
                      key={d}
                      className="ax-badge ax-badge--soft ax-badge--pill"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {d}
                      <button
                        type="button"
                        onClick={() => removeDomain(d)}
                        aria-label={`Remove ${d}`}
                        style={{ display: 'inline-flex', border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0 }}
                      >
                        {ICON_X_SMALL}
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="ax-field__hint">Press Enter or comma to add each domain.</p>
            </div>

            <div className="ax-field">
              <label className="ax-field__label" htmlFor="co-region">Region</label>
              <select id="co-region" className="ax-select" value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="ax-field">
              <label className="ax-field__label" htmlFor="co-disclaimer">Disclaimer enabled</label>
              <select
                id="co-disclaimer"
                className="ax-select"
                value={disclaimerEnabled ? 'true' : 'false'}
                onChange={(e) => setDisclaimerEnabled(e.target.value === 'true')}
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>

            <div className="ax-field">
              <label className="ax-field__label" htmlFor="co-retention">Event retention (months)</label>
              <input
                id="co-retention"
                className="ax-input"
                type="number"
                min={1}
                max={60}
                value={eventRetentionMonths}
                onChange={(e) => setEventRetentionMonths(Number(e.target.value))}
                required
              />
            </div>

            {error && <p className="ax-field__error">{error}</p>}
          </div>

          <div className="ax-card__footer ax-cluster" style={{ justifyContent: 'flex-end', gap: 'var(--ax-space-3)' }}>
            <button type="button" className="ax-btn ax-btn--secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="ax-btn ax-btn--primary" disabled={busy}>
              <span className="ax-btn__label">{busy ? 'Creating…' : 'Create organisation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- page */
interface Props {
  /** Wire this to your router — receives the row so the detail page can load it. */
  onViewOrganisation?: (org: OrganisationRecord) => void;
}

export function Org({ onViewOrganisation }: Props) {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrganisationRecord[]>(() => seedOrganisations(34));
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    listOrganisations().then((data) => { if (data.length) setOrgs(data); });
  }, []);

  const total = orgs.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const rows = useMemo(() => orgs.slice(start, start + PAGE_SIZE), [orgs, start]);

  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), pageCount));

  const createOrganisation = async (values: CreateOrgFormState) => {
    try {
      const created = await createOrganisationApi(values);
      setOrgs((prev) => [created, ...prev]);
    } catch (err) {
      // Fallback: optimistic local add
      const id = `ORG-${String(2000 + orgs.length + 1)}`;
      setOrgs((prev) => [{
        id, name: values.name, verifyDomain: values.verifyDomain, plan: '12',
        authRef: { label: 'pending-authorization.pdf', url: '#' },
        authAccept: false, authSignature: '—', authAt: new Date().toISOString(),
        region: values.region, disclaimerEnabled: values.disclaimerEnabled,
      }, ...prev]);
      if (err instanceof Error) throw err;
    }
    setPage(1);
    setCreateOpen(false);
  };

  const handleView = (org: OrganisationRecord) => {
    if (onViewOrganisation) {
      onViewOrganisation(org);
      return;
    }

    navigate(`/organisations/org/${encodeURIComponent(org.id)}`, {
      state: { organisation: org },
    });
  };

  return (
    <>
      <PageHead
        title="Organisations"
        subtitle="Every organisation on the platform and its authorization status."
        actions={
          <button type="button" className="ax-btn ax-btn--primary" onClick={() => setCreateOpen(true)}>
            {ICON_PLUS}<span className="ax-btn__label">Create Organisation</span>
          </button>
        }
      />

      <div className="ax-dash-grid">
        <section className="ax-card ax-col--12" role="region" aria-label="Organisations">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">Organisations</h2>
              <p className="ax-card__subtitle">{total.toLocaleString()} total organisation{total === 1 ? '' : 's'}</p>
            </div>
          </div>

          <div className="ax-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Id</th>
                  <th className="ax-table__th" scope="col">Name</th>
                  <th className="ax-table__th" scope="col">Verified domains</th>
                  <th className="ax-table__th" scope="col">Plan</th>
                  <th className="ax-table__th" scope="col">Auth ref</th>
                  <th className="ax-table__th" scope="col">Auth accept</th>
                  <th className="ax-table__th" scope="col">Auth signature</th>
                  <th className="ax-table__th" scope="col">Auth at</th>
                  <th className="ax-table__th" scope="col">Region</th>
                  <th className="ax-table__th" scope="col">Disclaimer</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="ax-table__row">
                    <td className="ax-table__td ax-num">{o.id}</td>
                    <td className="ax-table__td" style={{ color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-medium)' }}>{o.name}</td>
                    <td className="ax-table__td">
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-1)', flexWrap: 'wrap' }}>
                        {o.verifyDomain.map((d) => (
                          <span key={d} className="ax-badge ax-badge--soft ax-badge--pill" style={{ fontSize: 'var(--ax-text-xs)' }}>{d}</span>
                        ))}
                      </div>
                    </td>
                    <td className="ax-table__td">{o.plan} months</td>
                    <td className="ax-table__td">
                      <a
                        href={o.authRef.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ax-cluster"
                        style={{ gap: 6, color: 'var(--ax-accent)', textDecoration: 'none', fontWeight: 'var(--ax-weight-medium)', whiteSpace: 'nowrap' }}
                      >
                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2" />
                        </svg>
                        {o.authRef.label}
                      </a>
                    </td>
                    <td className="ax-table__td">
                      <span className={`ax-badge ax-badge--soft ax-badge--pill ${o.authAccept ? 'ax-badge--success' : 'ax-badge--warning'}`}>
                        <span className="ax-badge__dot" />{o.authAccept ? 'True' : 'False'}
                      </span>
                    </td>
                    <td className="ax-table__td" style={{ fontStyle: 'italic', color: 'var(--ax-text-muted)' }}>{o.authSignature}</td>
                    <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>{formatDate(o.authAt)}</td>
                    <td className="ax-table__td" style={{ whiteSpace: 'nowrap' }}>{o.region}</td>
                    <td className="ax-table__td">
                      <span className={`ax-badge ax-badge--soft ax-badge--pill ${o.disclaimerEnabled ? 'ax-badge--success' : 'ax-badge--warning'}`}>
                        <span className="ax-badge__dot" />{o.disclaimerEnabled ? 'True' : 'False'}
                      </span>
                    </td>
                    <td className="ax-table__td ax-table__td--num">
                      <div className="ax-cluster" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                          aria-label={`View ${o.name}`}
                          onClick={() => handleView(o)}
                        >
                          {ICON_EYE}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="ax-table__td" colSpan={11} style={{ textAlign: 'center', color: 'var(--ax-text-subtle)', padding: 'var(--ax-space-6)' }}>
                      No organisations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ax-card__footer ax-cluster" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>
              {total === 0 ? 'Showing 0 of 0' : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`}
            </span>
            <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Previous page" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                {ICON_CHEV_LEFT}
              </button>
              <span className="ax-num" style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-strong)', minWidth: 64, textAlign: 'center' }}>
                Page {page} of {pageCount}
              </span>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Next page" onClick={() => goToPage(page + 1)} disabled={page >= pageCount}>
                {ICON_CHEV_RIGHT}
              </button>
            </div>
          </div>
        </section>
      </div>

      {createOpen && (
        <CreateOrganisationModal onCancel={() => setCreateOpen(false)} onSubmit={createOrganisation} />
      )}
    </>
  );
}

export default Org;