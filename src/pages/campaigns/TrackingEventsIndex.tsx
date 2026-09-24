/*
 * Phause — Tracking Events index (route "/tracking-events").
 *
 * A standalone entry point for the sidebar "Tracking Events" nav item.
 * Because tracking events are per-campaign, this page provides a campaign
 * selector at the top and then renders the full tracking events view inline
 * for whichever campaign is selected — defaulting to the first campaign.
 *
 * Navigation flow:
 *   Sidebar → /tracking-events         (this page, campaign picker)
 *   CampaignDetails → Tracking Events  (goes to /api/campaigns/:id/tracking-events)
 *
 * Data: campaign list from the existing Zustand campaign store (same source
 * as CampaignList.tsx); tracking events from seedTrackingEvents() per
 * trackingEventsData.ts conventions.
 */
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '../../components/shell/PageHead';
import { useCampaignStore } from '../../stores/campaign.store';
import {
  seedTrackingEvents,
  type TrackingEvent,
  type TrackingEventType,
} from './trackingEventsData';

// ---------------------------------------------------------------------------
// Constants (duplicated from TrackingEvents.tsx to keep pages self-contained)
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

type FilterOption = 'all' | TrackingEventType;

const FILTER_OPTIONS: Array<{ value: FilterOption; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pixel_open', label: 'Opened' },
  { value: 'link_click', label: 'Clicked' },
  { value: 'landing_view', label: 'Landing viewed' },
];

const FUNNEL_STAGES: Array<{
  type: TrackingEventType;
  label: string;
  color: string;
}> = [
  { type: 'pixel_open', label: 'Email opened', color: 'var(--ax-accent)' },
  { type: 'link_click', label: 'Link clicked', color: 'var(--ax-viz-cyan)' },
  { type: 'landing_view', label: 'Landing viewed', color: 'var(--ax-viz-violet)' },
];

const BADGE_MODIFIER: Record<TrackingEventType, string> = {
  pixel_open: 'ax-badge--accent',
  link_click: 'ax-badge--warning',
  landing_view: 'ax-badge--danger',
};

const EVENT_LABEL: Record<TrackingEventType, string> = {
  pixel_open: 'Opened',
  link_click: 'Clicked',
  landing_view: 'Landing viewed',
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const ICON_CHEV_LEFT = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg>
);
const ICON_CHEV_RIGHT = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6" /></svg>
);
const ICON_COPY = (
  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" /></svg>
);
const ICON_CHECK_SMALL = (
  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l4 4L19 6" /></svg>
);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EventTypeBadge({ type }: { type: TrackingEventType }) {
  return (
    <span className={`ax-badge ax-badge--soft ax-badge--pill ${BADGE_MODIFIER[type]}`}>
      <span className="ax-badge__dot" />
      {EVENT_LABEL[type]}
    </span>
  );
}

function TrackingTokenCell({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <span className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'nowrap' }}>
      <span className="ax-num" title={token} style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>
        {token.slice(0, 8)}…
      </span>
      <button type="button" onClick={handleCopy} aria-label={copied ? 'Copied' : `Copy token ${token}`}
        style={{ display: 'inline-flex', alignItems: 'center', border: 0, background: 'transparent', color: copied ? 'var(--ax-success)' : 'var(--ax-text-subtle)', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}>
        {copied ? ICON_CHECK_SMALL : ICON_COPY}
      </button>
    </span>
  );
}

function FunnelCard({ counts }: { counts: Record<TrackingEventType, number> }) {
  const openCount = counts.pixel_open;
  return (
    <section className="ax-card ax-col--12" role="region" aria-label="Tracking funnel summary">
      <div className="ax-card__header">
        <div className="ax-card__titles">
          <span className="ax-card__eyebrow">Engagement funnel</span>
          <h2 className="ax-card__title">Funnel overview</h2>
          <p className="ax-card__subtitle">Drop-off from email open through to landing page view.</p>
        </div>
      </div>
      <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
        {FUNNEL_STAGES.map((stage, idx) => {
          const count = counts[stage.type];
          const prevCount = idx === 0 ? count : counts[FUNNEL_STAGES[idx - 1].type];
          const pct = prevCount === 0 ? 0 : Math.round((count / prevCount) * 100);
          const barPct = openCount === 0 ? 0 : Math.round((count / openCount) * 100);
          return (
            <div key={stage.type} style={{ display: 'grid', gridTemplateColumns: '160px 56px 1fr 64px', alignItems: 'center', gap: 'var(--ax-space-4)' }}>
              <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-medium)', whiteSpace: 'nowrap' }}>{stage.label}</span>
              <span className="ax-num" style={{ fontSize: 'var(--ax-text-sm)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', textAlign: 'right' }}>{count.toLocaleString()}</span>
              <div style={{ height: 10, borderRadius: 'var(--ax-radius-full)', background: 'var(--ax-surface-subtle)', overflow: 'hidden' }}
                role="meter" aria-valuenow={barPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${stage.label}: ${barPct}% of opens`}>
                <div style={{ height: '100%', width: `${barPct}%`, background: stage.color, borderRadius: 'var(--ax-radius-full)', transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {idx === 0 ? '— top' : `${pct}% of prev`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatUserAgent(ua: string): string {
  try {
    const osMatch = ua.match(/\(([^)]+)\)/);
    const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
    const os = osMatch ? osMatch[1].split(';')[0].trim() : '';
    const browser = browserMatch ? browserMatch[0] : '';
    if (os && browser) return `${os} · ${browser}`;
    return os || browser || ua;
  } catch { return ua; }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TrackingEventsIndex() {
  const { campaigns, templates, load } = useCampaignStore();
  useEffect(() => { if (!campaigns.length) void load(); }, [campaigns.length, load]);

  const [selectedId, setSelectedId] = useState<string>('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [page, setPage] = useState(1);

  // Once campaigns load, default to the first one.
  useEffect(() => {
    if (campaigns.length && !selectedId) setSelectedId(campaigns[0].id);
  }, [campaigns, selectedId]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedId);
  const templateName = selectedCampaign
    ? (templates.find((t) => t.id === selectedCampaign.templateId)?.name ?? selectedCampaign.templateId)
    : '';

  // Seed events for the selected campaign.
  const events = useMemo<TrackingEvent[]>(
    () => (selectedId ? seedTrackingEvents(selectedId) : []),
    [selectedId],
  );

  const counts = useMemo<Record<TrackingEventType, number>>(() => ({
    pixel_open: events.filter((e) => e.eventType === 'pixel_open').length,
    link_click: events.filter((e) => e.eventType === 'link_click').length,
    landing_view: events.filter((e) => e.eventType === 'landing_view').length,
  }), [events]);

  const filtered = useMemo(
    () => filter === 'all' ? events : events.filter((e) => e.eventType === filter),
    [events, filter],
  );

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const rows = useMemo(() => filtered.slice(start, start + PAGE_SIZE), [filtered, start]);

  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), pageCount));

  const handleFilter = (value: FilterOption) => { setFilter(value); setPage(1); };
  const handleCampaignChange = (id: string) => { setSelectedId(id); setFilter('all'); setPage(1); };

  return (
    <>
      <PageHead
        title="Tracking Events"
        subtitle="Simulation engagement events across campaigns."
      />

      <div className="ax-dash-grid">

        {/* ── Campaign selector ──────────────────────────────────────────── */}
        <section className="ax-card ax-col--12" role="region" aria-label="Campaign selector">
          <div className="ax-card__body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-4)', flexWrap: 'wrap' }}>
            <div className="ax-field" style={{ margin: 0, flex: '1 1 280px', maxWidth: 420 }}>
              <label className="ax-field__label" htmlFor="te-campaign-select">Campaign</label>
              <select
                id="te-campaign-select"
                className="ax-select"
                value={selectedId}
                onChange={(e) => handleCampaignChange(e.target.value)}
                disabled={!campaigns.length}
              >
                {!campaigns.length && <option value="">Loading campaigns…</option>}
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                ))}
              </select>
            </div>
            {selectedCampaign && (
              <div style={{ display: 'flex', gap: 'var(--ax-space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`ax-badge ax-badge--soft ax-badge--pill`}>
                  <span className="ax-badge__dot" />{selectedCampaign.status[0].toUpperCase() + selectedCampaign.status.slice(1)}
                </span>
                <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>
                  Template: <strong style={{ color: 'var(--ax-text-strong)' }}>{templateName}</strong>
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── Funnel summary ────────────────────────────────────────────── */}
        {selectedId && <FunnelCard counts={counts} />}

        {/* ── Events table ──────────────────────────────────────────────── */}
        {selectedId && (
          <section className="ax-card ax-col--12" role="region" aria-label="Tracking events">
            <div className="ax-card__header">
              <div className="ax-card__titles">
                <h2 className="ax-card__title">Events</h2>
                <p className="ax-card__subtitle">
                  {total.toLocaleString()} event{total === 1 ? '' : 's'}
                  {filter !== 'all' ? ` · filtered by ${EVENT_LABEL[filter as TrackingEventType]}` : ''}
                </p>
              </div>
              <div className="ax-card__actions">
                <div className="ax-btn-group ax-btn-group--segmented" role="radiogroup" aria-label="Filter by event type">
                  {FILTER_OPTIONS.map(({ value, label }) => (
                    <button key={value} type="button"
                      className={`ax-btn ax-btn--sm${filter === value ? ' is-selected' : ''}`}
                      role="radio" aria-checked={filter === value}
                      onClick={() => handleFilter(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="ax-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="ax-table ax-table--hover">
                <thead className="ax-table__head">
                  <tr>
                    <th className="ax-table__th" scope="col">Employee</th>
                    <th className="ax-table__th" scope="col">Event</th>
                    <th className="ax-table__th" scope="col">Tracking token</th>
                    <th className="ax-table__th" scope="col">Occurred at</th>
                    <th className="ax-table__th" scope="col">IP address</th>
                    <th className="ax-table__th" scope="col">Device / browser</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((event) => (
                    <tr key={event.id} className="ax-table__row">
                      <td className="ax-table__td">
                        <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{event.employee.name}</div>
                        <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>{event.employee.email}</div>
                      </td>
                      <td className="ax-table__td"><EventTypeBadge type={event.eventType} /></td>
                      <td className="ax-table__td"><TrackingTokenCell token={event.trackingToken} /></td>
                      <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--ax-text-sm)' }}>{formatDate(event.occurredAt)}</td>
                      <td className="ax-table__td ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)', color: event.meta?.ipAddress ? 'var(--ax-text-muted)' : 'var(--ax-text-subtle)' }}>
                        {event.meta?.ipAddress ?? '—'}
                      </td>
                      <td className="ax-table__td" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--ax-text-xs)', color: event.meta?.userAgent ? 'var(--ax-text-muted)' : 'var(--ax-text-subtle)' }} title={event.meta?.userAgent}>
                        {event.meta?.userAgent ? formatUserAgent(event.meta.userAgent) : '—'}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="ax-table__td" colSpan={6} style={{ textAlign: 'center', color: 'var(--ax-text-subtle)', padding: 'var(--ax-space-8)' }}>
                        No events match the current filter.
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
                <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Previous page" onClick={() => goToPage(page - 1)} disabled={page <= 1}>{ICON_CHEV_LEFT}</button>
                <span className="ax-num" style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-strong)', minWidth: 64, textAlign: 'center' }}>Page {page} of {pageCount}</span>
                <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Next page" onClick={() => goToPage(page + 1)} disabled={page >= pageCount}>{ICON_CHEV_RIGHT}</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

export default TrackingEventsIndex;
