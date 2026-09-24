/*
 * Phause — Security Awareness Dashboard (index route "/").
 *
 * Fetches live data from:
 *   GET /api/campaigns        → campaign counts & status breakdown
 *   GET /api/employees        → total employee count
 *   GET /api/organizations    → total org count
 *   GET /api/risk-scores      → latest risk score summary
 *   GET /api/risk-scores/trend → risk trend sparkline
 *   GET /api/reports          → recent reports list
 *
 * All fetches fall back gracefully when the API is offline.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHead } from '../../components/shell/PageHead';
import { listOrganisations } from '../../api/organisations/organisations.api';
import { listEmployees } from '../../api/employees/employees.api';
import { campaignsApiReal } from '../../api/campaigns/campaigns.real';
import { listRiskScores, getRiskTrend, listReports } from '../../api/reports/reports.api';
import type { Campaign } from '../../features/campaigns/types';
import type { ReportSummary, RiskTrendPoint, EmployeeRiskScore } from '../reports/reportsData';

// ─── tiny inline sparkline ───────────────────────────────────────────────────
function Spark({ data, color = 'var(--ax-accent)' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 80; const H = 32; const pts = data.length;
  const points = data
    .map((v, i) => `${(i / (pts - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── risk badge ──────────────────────────────────────────────────────────────
function RiskBadge({ score }: { score: number }) {
  const level = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  const colors: Record<string, string> = {
    critical: 'var(--ax-danger-500)',
    high:     'var(--ax-warning-500)',
    medium:   'var(--ax-viz-amber)',
    low:      'var(--ax-viz-emerald)',
  };
  return (
    <span style={{ fontWeight: 600, color: colors[level], fontVariantNumeric: 'tabular-nums' }}>
      {score.toFixed(0)}
    </span>
  );
}

// ─── status pill ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: 'var(--ax-surface-subtle)', color: 'var(--ax-text-muted)',    label: 'Draft' },
  scheduled: { bg: 'color-mix(in oklch,var(--ax-viz-cyan) 15%,transparent)',     color: 'var(--ax-viz-cyan)',    label: 'Scheduled' },
  running:   { bg: 'color-mix(in oklch,var(--ax-accent) 15%,transparent)',        color: 'var(--ax-accent)',      label: 'Running' },
  completed: { bg: 'color-mix(in oklch,var(--ax-viz-emerald) 15%,transparent)',  color: 'var(--ax-viz-emerald)', label: 'Completed' },
  cancelled: { bg: 'color-mix(in oklch,var(--ax-danger-500) 12%,transparent)',   color: 'var(--ax-danger-500)',  label: 'Cancelled' },
};
function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color, fontSize: 'var(--ax-text-xs)', fontWeight: 600 }}>
      <i style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, spark, sparkColor, icon, loading,
}: {
  label: string; value: string | number; sub?: string;
  spark?: number[]; sparkColor?: string; icon: React.ReactNode; loading: boolean;
}) {
  return (
    <div className="ax-card ax-kpi" role="region" aria-label={label}>
      <div className="ax-card__body">
        <div className="ax-kpi__top">
          <span className="ax-kpi__icon c1">{icon}</span>
          {sub && <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>{sub}</span>}
        </div>
        <div className="ax-kpi__label">{label}</div>
        <div className="ax-kpi__meta" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'flex-end' }}>
          <div className="ax-kpi__value ax-num" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {loading ? <span className="ax-skeleton" style={{ display: 'inline-block', width: 60, height: 24, borderRadius: 4 }} /> : value}
          </div>
          {spark && spark.length > 1 && <Spark data={spark} color={sparkColor} />}
        </div>
      </div>
    </div>
  );
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const IC_ORG  = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21l18 0" /><path d="M9 8l1 0" /><path d="M9 12l1 0" /><path d="M9 16l1 0" /><path d="M14 8l1 0" /><path d="M14 12l1 0" /><path d="M14 16l1 0" /><path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" /></svg>;
const IC_EMP  = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></svg>;
const IC_CAMP = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" /><path d="M3 7l9 6l9 -6" /></svg>;
const IC_RISK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" /><path d="M12 16h.01" /></svg>;

// ─── main component ───────────────────────────────────────────────────────────
export function PhauseDashboard() {
  const [loading, setLoading] = useState(true);
  const [orgCount, setOrgCount]       = useState(0);
  const [empCount, setEmpCount]       = useState(0);
  const [campaigns, setCampaigns]     = useState<Campaign[]>([]);
  const [riskScores, setRiskScores]   = useState<EmployeeRiskScore[]>([]);
  const [riskTrend, setRiskTrend]     = useState<RiskTrendPoint[]>([]);
  const [reports, setReports]         = useState<ReportSummary[]>([]);

  useEffect(() => {
    Promise.all([
      listOrganisations(),
      listEmployees(),
      campaignsApiReal.list(),
      listRiskScores(),
      getRiskTrend(),
      listReports(),
    ]).then(([orgs, emps, camps, risks, trend, rpts]) => {
      setOrgCount(orgs.length);
      setEmpCount(emps.length);
      setCampaigns(camps);
      setRiskScores(risks);
      setRiskTrend(trend);
      setReports(rpts.slice(0, 5));
      setLoading(false);
    });
  }, []);

  // derived numbers
  const activeCampaigns  = campaigns.filter((c) => c.status === 'running').length;
  const avgRisk = riskScores.length
    ? Math.round(riskScores.reduce((s, r) => s + r.riskScore, 0) / riskScores.length)
    : 0;
  const trendSpark = riskTrend.map((p) => p.avgRiskScore);

  // campaign status counts for mini bar
  const statusCounts = (['draft', 'scheduled', 'running', 'completed', 'cancelled'] as const).map((s) => ({
    status: s,
    count: campaigns.filter((c) => c.status === s).length,
  }));
  const recentCampaigns = [...campaigns].slice(0, 6);

  // top 5 riskiest employees
  const topRisk = [...riskScores].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return (
    <>
      <PageHead
        title="Security Awareness"
        subtitle="Live overview of your phishing simulation programme."
        actions={
          <>
            <Link className="ax-btn ax-btn--secondary" to="/api/campaigns/new">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
              <span className="ax-btn__label">New Campaign</span>
            </Link>
            <Link className="ax-btn ax-btn--primary" to="/reports">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /></svg>
              <span className="ax-btn__label">View Reports</span>
            </Link>
          </>
        }
      />

      <div className="ax-dash-grid">

        {/* ── KPI ROW ─────────────────────────────────────────────────────── */}
        <KpiCard label="Organisations"   value={orgCount}        icon={IC_ORG}  loading={loading} />
        <KpiCard label="Employees"       value={empCount}        icon={IC_EMP}  loading={loading} />
        <KpiCard label="Active Campaigns" value={activeCampaigns} icon={IC_CAMP} loading={loading}
          sub={campaigns.length ? `${campaigns.length} total` : undefined} />
        <KpiCard label="Avg. Risk Score"  value={avgRisk}         icon={IC_RISK} loading={loading}
          sub={riskScores.length ? `${riskScores.length} employees` : undefined}
          spark={trendSpark} sparkColor="var(--ax-danger-500)" />

        {/* ── CAMPAIGNS TABLE (8 cols) ─────────────────────────────────────── */}
        <section className="ax-card ax-col--8" role="region" aria-label="Recent campaigns">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">Campaigns</h2>
              <p className="ax-card__subtitle">Most recent phishing simulations</p>
            </div>
            <Link className="ax-btn ax-btn--link" to="/api/campaigns">View all</Link>
          </div>

          {/* status summary strip */}
          {!loading && campaigns.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--ax-space-3)', padding: '0 var(--ax-space-5) var(--ax-space-4)', flexWrap: 'wrap' }}>
              {statusCounts.filter((s) => s.count > 0).map(({ status, count }) => (
                <span key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>
                  <StatusPill status={status} />
                  <span className="ax-num">{count}</span>
                </span>
              ))}
            </div>
          )}

          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Name</th>
                  <th className="ax-table__th" scope="col">Status</th>
                  <th className="ax-table__th" scope="col">Targeting</th>
                  <th className="ax-table__th" scope="col">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="ax-table__row">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="ax-table__td">
                          <span className="ax-skeleton" style={{ display: 'inline-block', width: j === 0 ? 140 : 80, height: 14, borderRadius: 4 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : recentCampaigns.length === 0 ? (
                  <tr className="ax-table__row">
                    <td className="ax-table__td" colSpan={4} style={{ textAlign: 'center', color: 'var(--ax-text-subtle)', padding: 'var(--ax-space-8)' }}>
                      No campaigns yet — <Link className="ax-link" to="/api/campaigns/new">create one</Link>
                    </td>
                  </tr>
                ) : (
                  recentCampaigns.map((c) => (
                    <tr key={c.id} className="ax-table__row">
                      <td className="ax-table__td">
                        <Link
                          className="ax-link"
                          to={`/api/campaigns/${c.id}`}
                          style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="ax-table__td"><StatusPill status={c.status} /></td>
                      <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)', textTransform: 'capitalize' }}>
                        {c.targeting.targetMode === 'segment' && c.targeting.targetSegment
                          ? c.targeting.targetSegment
                          : c.targeting.targetMode === 'percentage' && c.targeting.targetSamplePercent != null
                            ? `${c.targeting.targetSamplePercent}% sample`
                            : 'All employees'}
                      </td>
                      <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)', fontVariantNumeric: 'tabular-nums' }}>
                        {c.scheduledAt
                          ? new Date(c.scheduledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── RISK TREND (4 cols) ──────────────────────────────────────────── */}
        <section className="ax-card ax-col--4" role="region" aria-label="Risk score trend">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">Risk Trend</h2>
              <p className="ax-card__subtitle">Average employee risk score over time</p>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            {loading ? (
              <div className="ax-skeleton" style={{ width: '100%', height: 120, borderRadius: 8 }} />
            ) : trendSpark.length > 1 ? (
              <>
                <svg viewBox={`0 0 240 100`} width="100%" height={100} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
                  {(() => {
                    const max = Math.max(...trendSpark, 1);
                    const min = Math.min(...trendSpark);
                    const range = max - min || 1;
                    const W = 240; const H = 88;
                    const pts = trendSpark.length;
                    const coords = trendSpark.map((v, i) => ({
                      x: (i / (pts - 1)) * W,
                      y: H - ((v - min) / range) * (H - 8) - 4,
                    }));
                    const polyPts = coords.map((c) => `${c.x},${c.y}`).join(' ');
                    const areaFill = `${coords.map((c) => `${c.x},${c.y}`).join(' ')} ${W},${H + 4} 0,${H + 4}`;
                    return (
                      <>
                        <defs>
                          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--ax-danger-500)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--ax-danger-500)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <polygon points={areaFill} fill="url(#riskGrad)" />
                        <polyline points={polyPts} fill="none" stroke="var(--ax-danger-500)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    );
                  })()}
                </svg>
                <div className="ax-cluster" style={{ justifyContent: 'space-between', marginTop: 'var(--ax-space-2)' }}>
                  {riskTrend.slice(0, 1).map((p) => (
                    <span key="start" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{p.month}</span>
                  ))}
                  {riskTrend.slice(-1).map((p) => (
                    <span key="end" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{p.month}</span>
                  ))}
                </div>
                <div style={{ marginTop: 'var(--ax-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>Current avg</span>
                    <RiskBadge score={trendSpark[trendSpark.length - 1] ?? 0} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>All-time high</span>
                    <span style={{ fontWeight: 600, color: 'var(--ax-text-strong)', fontVariantNumeric: 'tabular-nums' }}>{Math.max(...trendSpark).toFixed(0)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-sm)', margin: 0 }}>No trend data yet.</p>
            )}
          </div>
        </section>

        {/* ── TOP RISK EMPLOYEES (6 cols) ──────────────────────────────────── */}
        <section className="ax-card ax-col--6" role="region" aria-label="Highest risk employees">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">Highest Risk Employees</h2>
              <p className="ax-card__subtitle">Employees most likely to engage phishing</p>
            </div>
            <Link className="ax-btn ax-btn--link" to="/reports">Full report</Link>
          </div>
          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Employee</th>
                  <th className="ax-table__th" scope="col">Department</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="ax-table__row">
                      <td className="ax-table__td"><span className="ax-skeleton" style={{ display: 'inline-block', width: 120, height: 14, borderRadius: 4 }} /></td>
                      <td className="ax-table__td"><span className="ax-skeleton" style={{ display: 'inline-block', width: 80, height: 14, borderRadius: 4 }} /></td>
                      <td className="ax-table__td"><span className="ax-skeleton" style={{ display: 'inline-block', width: 40, height: 14, borderRadius: 4 }} /></td>
                    </tr>
                  ))
                ) : topRisk.length === 0 ? (
                  <tr className="ax-table__row">
                    <td className="ax-table__td" colSpan={3} style={{ textAlign: 'center', color: 'var(--ax-text-subtle)', padding: 'var(--ax-space-8)' }}>No risk data yet</td>
                  </tr>
                ) : (
                  topRisk.map((r) => (
                    <tr key={r.employeeId} className="ax-table__row">
                      <td className="ax-table__td">
                        <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{r.name || r.email}</div>
                        {r.name && <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{r.email}</div>}
                      </td>
                      <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>{r.department || '—'}</td>
                      <td className="ax-table__td ax-table__td--num"><RiskBadge score={r.riskScore} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── RECENT REPORTS (6 cols) ──────────────────────────────────────── */}
        <section className="ax-card ax-col--6" role="region" aria-label="Recent reports">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">Recent Reports</h2>
              <p className="ax-card__subtitle">AI-generated campaign analysis</p>
            </div>
            <Link className="ax-btn ax-btn--link" to="/reports">View all</Link>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="ax-skeleton" style={{ display: 'block', width: '70%', height: 14, borderRadius: 4 }} />
                  <span className="ax-skeleton" style={{ display: 'block', width: '90%', height: 12, borderRadius: 4 }} />
                </div>
              ))
            ) : reports.length === 0 ? (
              <p style={{ color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-sm)', margin: 0 }}>
                No reports yet — <Link className="ax-link" to="/reports">generate one from a campaign</Link>
              </p>
            ) : (
              reports.map((r) => (
                <div key={r.id} style={{ paddingBottom: 'var(--ax-space-4)', borderBottom: '1px solid var(--ax-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--ax-space-3)' }}>
                    <Link
                      className="ax-link"
                      to="/reports"
                      style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}
                    >
                      {r.campaignName}
                    </Link>
                    <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', whiteSpace: 'nowrap' }}>
                      {new Date(r.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--ax-space-4)', marginTop: 'var(--ax-space-2)' }}>
                    {[
                      { label: 'Open', value: r.openRate },
                      { label: 'Click', value: r.clickRate },
                      { label: 'Landing', value: r.landingRate },
                    ].map(({ label, value }) => (
                      <span key={label} style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>
                        {label}: <strong style={{ color: 'var(--ax-text-strong)', fontVariantNumeric: 'tabular-nums' }}>{value.toFixed(0)}%</strong>
                      </span>
                    ))}
                  </div>
                  {r.aiInsightSnippet && (
                    <p style={{ margin: '6px 0 0', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.aiInsightSnippet}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </>
  );
}

export default PhauseDashboard;
