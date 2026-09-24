/*
 * Phause — Campaign Tracking Events: shared types, seed data, and endpoint constants.
 *
 * Coverage: event types 9.1–9.3 only.
 *   9.1 pixel_open   → fired when the recipient's email client loads the 1×1
 *                       tracking pixel embedded in the phishing email.
 *   9.2 link_click   → fired when the recipient clicks the phishing link in the email.
 *   9.3 landing_view → fired when the recipient's browser loads the fake landing page.
 *
 * BEACON ENDPOINTS (write-triggering — never call from the dashboard):
 *   GET /api/tracking/pixel/:trackingToken   (records a pixel_open)
 *   GET /api/tracking/click/:trackingToken   (records a link_click)
 *   GET /api/tracking/landing/:trackingToken (records a landing_view)
 *
 * These are referenced here only as documentation constants so that event type
 * values can be mapped to their originating beacon path in tooltips/comments.
 * The dashboard MUST NOT call them — each call would write a new tracking event.
 *
 * READ endpoint (used by the dashboard):
 *   PLACEHOLDER ASSUMPTION — confirm/replace path before wiring to the real API.
 *   Assumed: GET /api/campaigns/:campaignId/tracking-events
 *   Expected response: TrackingEvent[]
 */

// ---------------------------------------------------------------------------
// Beacon path constants — documentation only, never call from the dashboard.
// ---------------------------------------------------------------------------

export const BEACON_PATHS = {
  pixel_open: '/api/tracking/pixel/:trackingToken',
  link_click: '/api/tracking/click/:trackingToken',
  landing_view: '/api/tracking/landing/:trackingToken',
} as const;

// ---------------------------------------------------------------------------
// Read endpoint — swap for the confirmed real path before API integration.
// ---------------------------------------------------------------------------

/**
 * PLACEHOLDER — assumed list endpoint, not confirmed in the current API spec.
 * Replace with the real path once the backend contract is confirmed.
 * Usage: `${TRACKING_EVENTS_ENDPOINT(campaignId)}`
 */
export const TRACKING_EVENTS_ENDPOINT = (campaignId: string) =>
  `/api/campaigns/${encodeURIComponent(campaignId)}/tracking-events`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The three event types in scope for steps 9.1–9.3.
 * 9.4 (credentials_submitted) and 9.5 (reported_phishing) are intentionally
 * excluded from this build.
 */
export type TrackingEventType = 'pixel_open' | 'link_click' | 'landing_view';

/**
 * Minimal employee snapshot embedded in a tracking event.
 * References the same conceptual fields as EmployeeRecord in Employees.tsx
 * (id, name, email) without re-importing that page's internal type, since
 * tracking events only need the identifying trio and EmployeeRecord carries
 * additional fields (department, seniority, etc.) that are irrelevant here.
 */
export interface TrackingEventEmployee {
  id: string;
  name: string;
  email: string;
}

/**
 * Optional enrichment metadata.
 * - ipAddress / userAgent are available for link_click and landing_view
 *   (browser-originated requests), but typically absent for pixel_open
 *   (many email clients strip or proxy headers so data is unreliable).
 */
export interface TrackingEventMeta {
  ipAddress?: string;
  userAgent?: string;
}

/** A single recorded tracking event for a campaign recipient. */
export interface TrackingEvent {
  /** Unique event record identifier. */
  id: string;
  /** The campaign this event belongs to. */
  campaignId: string;
  /** Snapshot of the employee who triggered the event. */
  employee: TrackingEventEmployee;
  /** UUID token issued to this specific recipient when the campaign was dispatched. */
  trackingToken: string;
  /** Which step in the funnel fired this event. */
  eventType: TrackingEventType;
  /** ISO 8601 timestamp of when the event was recorded by the backend. */
  occurredAt: string;
  /** Optional enrichment — typically present for link_click / landing_view. */
  meta?: TrackingEventMeta;
}

// ---------------------------------------------------------------------------
// Seed data — stands in for a real GET /api/campaigns/:id/tracking-events call.
// Swap for a real fetch once the API is confirmed.
// ---------------------------------------------------------------------------

const SAMPLE_EMPLOYEES: TrackingEventEmployee[] = [
  { id: 'EMP-1001', name: 'Bob Jones', email: 'bob@acme.com' },
  { id: 'EMP-1002', name: 'Carol White', email: 'carol@acme.com' },
  { id: 'EMP-1003', name: 'Dave Brown', email: 'dave@acme.com' },
  { id: 'EMP-1004', name: 'Maya Patel', email: 'maya@northwind.io' },
  { id: 'EMP-1005', name: 'Liam Smith', email: 'liam@globex.co' },
  { id: 'EMP-1006', name: 'Priya Nair', email: 'priya@initech.dev' },
  { id: 'EMP-1007', name: 'James Osei', email: 'james@acme.com' },
  { id: 'EMP-1008', name: 'Sofia Reyes', email: 'sofia@northwind.io' },
  { id: 'EMP-1009', name: 'Aaron Levy', email: 'aaron@globex.co' },
  { id: 'EMP-1010', name: 'Nadia Kumar', email: 'nadia@initech.dev' },
  { id: 'EMP-1011', name: 'Tom Fischer', email: 'tom@acme.com' },
  { id: 'EMP-1012', name: 'Amara Diallo', email: 'amara@northwind.io' },
];

const SAMPLE_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
];

const SAMPLE_IPS = [
  '203.0.113.12',
  '198.51.100.44',
  '192.0.2.87',
  '203.0.113.101',
  '198.51.100.200',
  '192.0.2.15',
];

function makeToken(seed: number): string {
  // Deterministic fake UUID-shaped token based on seed.
  const hex = (n: number, len: number) =>
    Math.abs(Math.floor(n * 7919 + 31337))
      .toString(16)
      .padStart(len, '0')
      .slice(0, len);
  return `${hex(seed, 8)}-${hex(seed + 1, 4)}-4${hex(seed + 2, 3)}-${hex(seed + 3, 4)}-${hex(seed + 4, 12)}`;
}

/**
 * Generate seed tracking events for a given campaignId.
 * The funnel is naturally narrowing: most employees open, fewer click,
 * fewer still view the landing page — realistic drop-off at each stage.
 */
export function seedTrackingEvents(campaignId: string): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  const base = new Date('2026-09-18T09:00:00.000Z').getTime();

  // Assign each employee a tracking token (stable per employee index).
  // Funnel: all 12 open, 8 click, 5 view landing.
  const openers = SAMPLE_EMPLOYEES.slice(0, 12);
  const clickers = SAMPLE_EMPLOYEES.slice(0, 8);
  const viewers = SAMPLE_EMPLOYEES.slice(0, 5);

  let eventSeq = 1;

  openers.forEach((emp, i) => {
    const token = makeToken(i + 100);
    events.push({
      id: `EVT-${campaignId}-${String(eventSeq++).padStart(3, '0')}`,
      campaignId,
      employee: emp,
      trackingToken: token,
      eventType: 'pixel_open',
      // pixel opens are spread over the first 4 hours; no reliable meta
      occurredAt: new Date(base + i * 18 * 60 * 1000).toISOString(),
    });
  });

  clickers.forEach((emp, i) => {
    const token = makeToken(i + 100); // same token as their open event
    events.push({
      id: `EVT-${campaignId}-${String(eventSeq++).padStart(3, '0')}`,
      campaignId,
      employee: emp,
      trackingToken: token,
      eventType: 'link_click',
      // clicks happen after opens, spread over next 2 hours
      occurredAt: new Date(base + 4 * 60 * 60 * 1000 + i * 15 * 60 * 1000).toISOString(),
      meta: {
        ipAddress: SAMPLE_IPS[i % SAMPLE_IPS.length],
        userAgent: SAMPLE_USER_AGENTS[i % SAMPLE_USER_AGENTS.length],
      },
    });
  });

  viewers.forEach((emp, i) => {
    const token = makeToken(i + 100);
    events.push({
      id: `EVT-${campaignId}-${String(eventSeq++).padStart(3, '0')}`,
      campaignId,
      employee: emp,
      trackingToken: token,
      eventType: 'landing_view',
      // landing views happen shortly after the click
      occurredAt: new Date(base + 4 * 60 * 60 * 1000 + i * 15 * 60 * 1000 + 45 * 1000).toISOString(),
      meta: {
        ipAddress: SAMPLE_IPS[i % SAMPLE_IPS.length],
        userAgent: SAMPLE_USER_AGENTS[i % SAMPLE_USER_AGENTS.length],
      },
    });
  });

  // Sort by occurredAt ascending so the table reads chronologically.
  events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  return events;
}
