/*
 * Phause — Campaign Tracking Events (route "api/campaigns/:campaignId/tracking-events").
 *
 * Read-only view of the first three funnel stages for one campaign:
 *   9.1 pixel_open   — email opened (tracking pixel fired by email client)
 *   9.2 link_click   — recipient clicked the phishing link
 *   9.3 landing_view — recipient viewed the fake landing page
 *
 * Layout:
 *   1. Funnel summary card — Opened → Clicked → Viewed landing, with count,
 *      % of prior stage, and a progress-bar fill per stage (mirrors the
 *      Conversion Funnel card in the Analytics dashboard).
 *   2. Event type filter — segmented control (ax-btn-group--segmented,
 *      role="radiogroup") matching the Week/Month/Year pattern used elsewhere.
 *   3. Paginated events table — 10 rows/page, running total, prev/next.
 *
 * Data comes from seedTrackingEvents() — swap for a real fetch to
 * GET /api/campaigns/:campaignId/tracking-events when the API is confirmed.
 * See trackingEventsData.ts for endpoint placeholder details.
 *
 * No create/edit/delete actions — tracking events are system-generated.
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHead } from '../../components/shell/PageHead';
import {
  seedTrackingEvents,
  type TrackingEvent,
  type TrackingEventType,
} from './trackingEventsData';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

type FilterOption = 'all' | TrackingEventType;

const FILTER_OPTIONS: Array<{ value: FilterOption; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pixel_open', label: 'Opened' },
  { value: 'link_click', label: 'Clicked' },
  { value: 'landing_view', label: 'Landing viewed' },
];

// Funnel stage configuration — order matters (defines drop-off direction).
const FUNNEL_STAGES: Array<{
  type: TrackingEventType;
  label: string;
  color: string;
  bgColor: string;
}> = [
  {
    type: 'pixel_open',
    label: 'Email opened',
    color: 'var(--ax-accent)',
    bgColor: 'color-mix(in oklab, var(--ax-accent) 12%, transparent)',
  },
  {
    type: 'link_click',
    label: 'Link clicked',
    color: 'var(--ax-viz-cyan)',
    bgColor: 'color-mix(in oklab, var(--ax-viz-cyan) 12%, transparent)',
  },
  {
    type: 'landing_view',
    label: 'Landing viewed',
    color: 'var(--ax-viz-violet)',
    bgColor: 'color-mix(in oklab, var(--ax-viz-violet) 12%, transparent)',
  },
];

// Badge tone per event type — mirrors how status/consent badges work elsewhere.
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
// Icons (inline SVG, same convention as every other page in this project)
// ---------------------------------------------------------------------------

const ICON_CHEV_LEFT = (
  <svg
    className="ax-btn__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 6l-6 6l6 6" />
  </svg>
);

const ICON_CHEV_RIGHT = (
  <svg
    className="ax-btn__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 6l6 6l-6 6" />
  </svg>
);

const ICON_COPY = (
  <svg
    viewBox="0 0 24 24"
    width={13}
    height={13}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" />
    <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);

const ICON_CHECK_SMALL = (
  <svg
    viewBox="0 0 24 24"
    width={13}
    height={13}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12l4 4L19 6" />
  </svg>
);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Colour-coded event type badge — same ax-badge--soft --pill pattern as everywhere else. */
function EventTypeBadge({ type }: { type: TrackingEventType }) {
  return (
    <span className={`ax-badge ax-badge--soft ax-badge--pill ${BADGE_MODIFIER[type]}`}>
      <span className="ax-badge__dot" />
      {EVENT_LABEL[type]}
    </span>
  );
}

/** Truncated tracking token with a one-click copy affordance. */
function TrackingTokenCell({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // Show first 8 chars + ellipsis; full value is in title for hover.
  const short = `${token.slice(0, 8)}…`;

  return (
    <span
      className="ax-cluster"
      style={{ gap: 'var(--ax-space-2)', flexWrap: 'nowrap' }}
    >
      <span
        className="ax-num"
        title={token}
        style={{
          fontFamily: 'var(--ax-font-mono)',
          fontSize: 'var(--ax-text-xs)',
          color: 'var(--ax-text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {short}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : `Copy full token ${token}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: 0,
          background: 'transparent',
          color: copied ? 'var(--ax-success)' : 'var(--ax-text-subtle)',
          cursor: 'pointer',
          padding: 0,
          transition: 'color 0.15s',
        }}
      >
        {copied ? ICON_CHECK_SMALL : ICON_COPY}
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Funnel summary card
// ---------------------------------------------------------------------------

interface FunnelCardProps {
  counts: Record<TrackingEventType, number>;
}

function FunnelCard({ counts }: FunnelCardProps) {
  const openCount = counts.pixel_open;

  return (
    <section
      className="ax-card ax-col--12"
      role="region"
      aria-label="Tracking funnel summary"
    >
      <div className="ax-card__header">
        <div className="ax-card__titles">
          <span className="ax-card__eyebrow">Engagement funnel</span>
          <h2 className="ax-card__title">Funnel overview</h2>
          <p className="ax-card__subtitle">
            Drop-off from email open through to landing page view.
          </p>
        </div>
      </div>

      <div
        className="ax-card__body"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}
      >
        {FUNNEL_STAGES.map((stage, idx) => {
          const count = counts[stage.type];
          // Percentage relative to the stage immediately above (or 100% for the first).
          const prevCount =
            idx === 0 ? count : counts[FUNNEL_STAGES[idx - 1].type];
          const pct = prevCount === 0 ? 0 : Math.round((count / prevCount) * 100);
          // Bar width relative to the top-of-funnel count so bars are visually comparable.
          const barPct = openCount === 0 ? 0 : Math.round((count / openCount) * 100);

          return (
            <div
              key={stage.type}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 56px 1fr 64px',
                alignItems: 'center',
                gap: 'var(--ax-space-4)',
              }}
            >
              {/* Stage label */}
              <span
                style={{
                  fontSize: 'var(--ax-text-sm)',
                  color: 'var(--ax-text-strong)',
                  fontWeight: 'var(--ax-weight-medium)',
                  whiteSpace: 'nowrap',
                }}
              >
                {stage.label}
              </span>

              {/* Count */}
              <span
                className="ax-num"
                style={{
                  fontSize: 'var(--ax-text-sm)',
                  fontWeight: 'var(--ax-weight-semibold)',
                  color: 'var(--ax-text-strong)',
                  textAlign: 'right',
                }}
              >
                {count.toLocaleString()}
              </span>

              {/* Progress bar */}
              <div
                style={{
                  height: 10,
                  borderRadius: 'var(--ax-radius-full)',
                  background: 'var(--ax-surface-subtle)',
                  overflow: 'hidden',
                }}
                role="meter"
                aria-valuenow={barPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${stage.label}: ${barPct}% of total opens`}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${barPct}%`,
                    background: stage.color,
                    borderRadius: 'var(--ax-radius-full)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Drop-off percentage vs prior stage */}
              <span
                style={{
                  fontSize: 'var(--ax-text-xs)',
                  color:
                    idx === 0
                      ? 'var(--ax-text-muted)'
                      : 'var(--ax-text-subtle)',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {idx === 0 ? '— top' : `${pct}% of prev`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function TrackingEvents() {
  const { campaignId = 'CMP-1002' } = useParams<{ campaignId: string }>();

  // Seed data — replace with a real fetch to TRACKING_EVENTS_ENDPOINT(campaignId)
  // when the API is confirmed. See trackingEventsData.ts for details.
  // Example: fetch(TRACKING_EVENTS_ENDPOINT(campaignId))
  const [events] = useState<TrackingEvent[]>(() => seedTrackingEvents(campaignId));

  const [filter, setFilter] = useState<FilterOption>('all');
  const [page, setPage] = useState(1);

  // Funnel counts (always computed over the full unfiltered dataset).
  const counts = useMemo<Record<TrackingEventType, number>>(
    () => ({
      pixel_open: events.filter((e) => e.eventType === 'pixel_open').length,
      link_click: events.filter((e) => e.eventType === 'link_click').length,
      landing_view: events.filter((e) => e.eventType === 'landing_view').length,
    }),
    [events],
  );

  // Filtered rows for the table.
  const filtered = useMemo(
    () =>
      filter === 'all'
        ? events
        : events.filter((e) => e.eventType === filter),
    [events, filter],
  );

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const rows = useMemo(
    () => filtered.slice(start, start + PAGE_SIZE),
    [filtered, start],
  );

  const goToPage = (p: number) =>
    setPage(Math.min(Math.max(1, p), pageCount));

  // Reset to page 1 whenever the filter changes.
  const handleFilter = (value: FilterOption) => {
    setFilter(value);
    setPage(1);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <>
      <PageHead
        title="Tracking Events"
        subtitle={`Simulation engagement events for campaign ${campaignId}.`}
        actions={
          <Link className="ax-btn ax-btn--secondary" to={`/api/campaigns/${campaignId}`}>
            <span className="ax-btn__label">Back to campaign</span>
          </Link>
        }
      />

      <div className="ax-dash-grid">
        {/* ── 1. Funnel summary ──────────────────────────────────────────── */}
        <FunnelCard counts={counts} />

        {/* ── 2. Filter + events table ───────────────────────────────────── */}
        <section
          className="ax-card ax-col--12"
          role="region"
          aria-label="Tracking events"
        >
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">Events</h2>
              <p className="ax-card__subtitle">
                {total.toLocaleString()} event
                {total === 1 ? '' : 's'}
                {filter !== 'all'
                  ? ` · filtered by ${EVENT_LABEL[filter as TrackingEventType]}`
                  : ''}
              </p>
            </div>

            {/* Segmented filter control — mirrors Week/Month/Year pattern */}
            <div className="ax-card__actions">
              <div
                className="ax-btn-group ax-btn-group--segmented"
                role="radiogroup"
                aria-label="Filter by event type"
              >
                {FILTER_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`ax-btn ax-btn--sm${filter === value ? ' is-selected' : ''}`}
                    role="radio"
                    aria-checked={filter === value}
                    onClick={() => handleFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
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
                    {/* Employee */}
                    <td className="ax-table__td">
                      <div
                        style={{
                          fontWeight: 'var(--ax-weight-medium)',
                          color: 'var(--ax-text-strong)',
                        }}
                      >
                        {event.employee.name}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--ax-text-xs)',
                          color: 'var(--ax-text-muted)',
                        }}
                      >
                        {event.employee.email}
                      </div>
                    </td>

                    {/* Event type badge */}
                    <td className="ax-table__td">
                      <EventTypeBadge type={event.eventType} />
                    </td>

                    {/* Tracking token — truncated + copy */}
                    <td className="ax-table__td">
                      <TrackingTokenCell token={event.trackingToken} />
                    </td>

                    {/* Timestamp */}
                    <td
                      className="ax-table__td"
                      style={{
                        color: 'var(--ax-text-muted)',
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--ax-text-sm)',
                      }}
                    >
                      {formatDate(event.occurredAt)}
                    </td>

                    {/* IP address — only present for link_click / landing_view */}
                    <td
                      className="ax-table__td ax-num"
                      style={{
                        fontFamily: 'var(--ax-font-mono)',
                        fontSize: 'var(--ax-text-xs)',
                        color: event.meta?.ipAddress
                          ? 'var(--ax-text-muted)'
                          : 'var(--ax-text-subtle)',
                      }}
                    >
                      {event.meta?.ipAddress ?? '—'}
                    </td>

                    {/* User agent — shortened to first meaningful segment */}
                    <td
                      className="ax-table__td"
                      style={{
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 'var(--ax-text-xs)',
                        color: event.meta?.userAgent
                          ? 'var(--ax-text-muted)'
                          : 'var(--ax-text-subtle)',
                      }}
                      title={event.meta?.userAgent}
                    >
                      {event.meta?.userAgent
                        ? formatUserAgent(event.meta.userAgent)
                        : '—'}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td
                      className="ax-table__td"
                      colSpan={6}
                      style={{
                        textAlign: 'center',
                        color: 'var(--ax-text-subtle)',
                        padding: 'var(--ax-space-8)',
                      }}
                    >
                      No events match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer — same Showing X–Y of Z + prev/next pattern as all other tables */}
          <div
            className="ax-card__footer ax-cluster"
            style={{ justifyContent: 'space-between' }}
          >
            <span
              style={{
                fontSize: 'var(--ax-text-sm)',
                color: 'var(--ax-text-muted)',
              }}
            >
              {total === 0
                ? 'Showing 0 of 0'
                : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`}
            </span>

            <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
              <button
                type="button"
                className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                aria-label="Previous page"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                {ICON_CHEV_LEFT}
              </button>
              <span
                className="ax-num"
                style={{
                  fontSize: 'var(--ax-text-sm)',
                  color: 'var(--ax-text-strong)',
                  minWidth: 64,
                  textAlign: 'center',
                }}
              >
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                aria-label="Next page"
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount}
              >
                {ICON_CHEV_RIGHT}
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a readable browser/OS summary from a raw user agent string.
 * Returns the first parenthesised segment (OS) + the browser name, e.g.
 * "Windows NT 10.0; Win64; x64 · Chrome/126.0"
 * Falls back to the raw string if parsing fails.
 */
function formatUserAgent(ua: string): string {
  try {
    const osMatch = ua.match(/\(([^)]+)\)/);
    const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
    const os = osMatch ? osMatch[1].split(';')[0].trim() : '';
    const browser = browserMatch ? browserMatch[0] : '';
    if (os && browser) return `${os} · ${browser}`;
    if (os) return os;
    if (browser) return browser;
    return ua;
  } catch {
    return ua;
  }
}

export default TrackingEvents;
