/*
 * Phause — Reports & Risk Scores (route "reports").
 *
 * Covers all 10 sub-items in Step 10:
 *   10.1  Generate AI report (POST /api/reports/generate)
 *   10.2  View report detail (modal)
 *   10.3  List all reports table
 *   10.4  Export as CSV
 *   10.5  Export as PDF
 *   10.6  Employee risk scores table
 *   10.7  Risk score trend (ApexCharts line)
 *   10.8  Department vulnerability heatmap table
 *   10.9  Template effectiveness table
 *   10.10 Training correlation table
 */
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '../../components/shell/PageHead';
import { ApexChart } from '../../components/charts/ApexChart';
import {
  type DepartmentRisk,
  type EmployeeRiskScore,
  type ReportSummary,
  type RiskLevel,
  type RiskTrendPoint,
  type TemplateEffectiveness,
  type TrainingCorrelationRow,
} from './reportsData';
import {
  exportCsvUrl,
  exportPdfUrl,
  generateReport,
  getRiskByDepartment,
  getRiskTrend,
  getTemplateEffectiveness,
  getTrainingCorrelation,
  listReports,
  listRiskScores,
} from '../../api/reports/reports.api';
import { mockCampaigns } from '../../features/campaigns/mocks';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const cv = (n: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// ---------------------------------------------------------------------------
// Shared icons
// ---------------------------------------------------------------------------

const ICON_CLOSE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
);
const ICON_CHEV_L = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg>
);
const ICON_CHEV_R = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6" /></svg>
);
const ICON_DOWNLOAD = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><path d="M7 11l5 5l5-5" /><path d="M12 4v12" /></svg>
);
const ICON_PLUS = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
);
const ICON_EYE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0-4 0" /><path d="M21 12c-2.4 4-5.4 6-9 6c-3.6 0-6.6-2-9-6c2.4-4 5.4-6 9-6c3.6 0 6.6 2 9 6" /></svg>
);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function Pagination({ page, pageCount, total, start, size, onPage }: { page: number; pageCount: number; total: number; start: number; size: number; onPage: (p: number) => void }) {
  return (
    <div className="ax-card__footer ax-cluster" style={{ justifyContent: 'space-between' }}>
      <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>
        {total === 0 ? 'Showing 0 of 0' : `Showing ${start + 1}–${Math.min(start + size, total)} of ${total}`}
      </span>
      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
        <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Previous page" onClick={() => onPage(page - 1)} disabled={page <= 1}>{ICON_CHEV_L}</button>
        <span className="ax-num" style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-strong)', minWidth: 64, textAlign: 'center' }}>Page {page} of {pageCount}</span>
        <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Next page" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>{ICON_CHEV_R}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk level badge
// ---------------------------------------------------------------------------

const RISK_BADGE: Record<RiskLevel, string> = {
  critical: 'ax-badge--danger',
  high:     'ax-badge--warning',
  medium:   'ax-badge--accent',
  low:      'ax-badge--success',
};

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`ax-badge ax-badge--soft ax-badge--pill ${RISK_BADGE[level]}`}>
      <span className="ax-badge__dot" />{level[0].toUpperCase() + level.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Report status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ReportSummary['status'] }) {
  const cls = status === 'ready' ? 'ax-badge--success' : status === 'generating' ? 'ax-badge--warning' : 'ax-badge--danger';
  return (
    <span className={`ax-badge ax-badge--soft ax-badge--pill ${cls}`}>
      <span className="ax-badge__dot" />{status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 10.2 — Report detail modal
// ---------------------------------------------------------------------------

function ReportModal({ report, onClose }: { report: ReportSummary; onClose: () => void }) {
  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)', background: 'rgba(15,18,25,.5)', backdropFilter: 'blur(4px)' }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="rpt-modal-title"
        style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: 'var(--ax-surface)', borderRadius: 'var(--ax-radius-lg)', border: '1px solid var(--ax-border)', boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
        <div className="ax-card__header">
          <div className="ax-card__titles">
            <span className="ax-card__eyebrow">{report.id}</span>
            <h2 className="ax-card__title" id="rpt-modal-title">{report.campaignName}</h2>
          </div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onClose}>{ICON_CLOSE}</button>
        </div>
        <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--ax-space-3)' }}>
            {[['Open rate', `${report.openRate}%`], ['Click rate', `${report.clickRate}%`], ['Landing rate', `${report.landingRate}%`]].map(([l, v]) => (
              <div key={l} style={{ background: 'var(--ax-surface-subtle)', borderRadius: 'var(--ax-radius-md)', padding: 'var(--ax-space-3)', textAlign: 'center' }}>
                <div className="ax-num" style={{ fontSize: 'var(--ax-text-xl)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)' }}>{v}</div>
                <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)', marginTop: 'var(--ax-space-1)' }}>{l}</div>
              </div>
            ))}
          </div>
          <div>
            <p style={{ margin: '0 0 var(--ax-space-2)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', textTransform: 'uppercase', letterSpacing: '.04em' }}>AI Insight</p>
            <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text)', lineHeight: 1.6 }}>{report.aiInsightSnippet}</p>
          </div>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-3)', margin: 0 }}>
            {[['Campaign', report.campaignId], ['Targeted', String(report.totalTargeted)], ['Generated', fmt(report.generatedAt)], ['Status', report.status]].map(([k, v]) => (
              <div key={k}>
                <dt style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</dt>
                <dd style={{ margin: 0, color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="ax-card__footer ax-cluster" style={{ justifyContent: 'flex-end', gap: 'var(--ax-space-3)' }}>
          {/* 10.4 & 10.5 — export buttons — authenticated download links */}
          <a className="ax-btn ax-btn--secondary" href={exportCsvUrl(report.id)} download aria-label={`Export ${report.id} as CSV`}>
            {ICON_DOWNLOAD}<span className="ax-btn__label">CSV</span>
          </a>
          <a className="ax-btn ax-btn--secondary" href={exportPdfUrl(report.id)} download aria-label={`Export ${report.id} as PDF`}>
            {ICON_DOWNLOAD}<span className="ax-btn__label">PDF</span>
          </a>
          <button type="button" className="ax-btn ax-btn--primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10.1 — Generate report modal
// ---------------------------------------------------------------------------

function GenerateModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (campaignId: string) => void }) {
  const [campaignId, setCampaignId] = useState(mockCampaigns[2].id); // default to completed
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // PLACEHOLDER — swap for: fetch(REPORT_ENDPOINTS.generate, { method:'POST', body: JSON.stringify({ campaignId }) })
    await new Promise((r) => setTimeout(r, 800));
    onGenerate(campaignId);
    setBusy(false);
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)', background: 'rgba(15,18,25,.5)', backdropFilter: 'blur(4px)' }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="gen-modal-title"
        style={{ width: '100%', maxWidth: 440, background: 'var(--ax-surface)', borderRadius: 'var(--ax-radius-lg)', border: '1px solid var(--ax-border)', boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
        <div className="ax-card__header">
          <div className="ax-card__titles"><h2 className="ax-card__title" id="gen-modal-title">Generate AI report</h2></div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onClose}>{ICON_CLOSE}</button>
        </div>
        <form onSubmit={submit}>
          <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            <div className="ax-field">
              <label className="ax-field__label" htmlFor="gen-campaign">Campaign</label>
              <select id="gen-campaign" className="ax-select" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                {mockCampaigns.filter((c) => c.status === 'completed' || c.status === 'running').map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                ))}
              </select>
              <p className="ax-field__hint">Only completed or running campaigns can generate a report.</p>
            </div>
          </div>
          <div className="ax-card__footer ax-cluster" style={{ justifyContent: 'flex-end', gap: 'var(--ax-space-3)' }}>
            <button type="button" className="ax-btn ax-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="ax-btn ax-btn--primary" disabled={busy}>
              <span className="ax-btn__label">{busy ? 'Generating…' : 'Generate report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function Reports() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [riskScores, setRiskScores] = useState<EmployeeRiskScore[]>([]);
  const [riskTrend, setRiskTrend] = useState<RiskTrendPoint[]>([]);
  const [deptRisks, setDeptRisks] = useState<DepartmentRisk[]>([]);
  const [templateEff, setTemplateEff] = useState<TemplateEffectiveness[]>([]);
  const [trainingCorr, setTrainingCorr] = useState<TrainingCorrelationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewReport, setViewReport] = useState<ReportSummary | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [rptPage, setRptPage] = useState(1);
  const [riskPage, setRiskPage] = useState(1);

  // Load all data on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      listReports(),
      listRiskScores(),
      getRiskTrend(),
      getRiskByDepartment(),
      getTemplateEffectiveness(),
      getTrainingCorrelation(),
    ]).then(([r, rs, rt, dr, te, tc]) => {
      setReports(r);
      setRiskScores(rs);
      setRiskTrend(rt);
      setDeptRisks(dr);
      setTemplateEff(te);
      setTrainingCorr(tc);
      setLoading(false);
    });
  }, []);

  // 10.3 — paginated reports list
  const rptTotal = reports.length;
  const rptPageCount = Math.max(1, Math.ceil(rptTotal / PAGE_SIZE));
  const rptStart = (rptPage - 1) * PAGE_SIZE;
  const rptRows = useMemo(() => reports.slice(rptStart, rptStart + PAGE_SIZE), [reports, rptStart]);

  // 10.6 — paginated risk scores
  const riskTotal = riskScores.length;
  const riskPageCount = Math.max(1, Math.ceil(riskTotal / PAGE_SIZE));
  const riskStart = (riskPage - 1) * PAGE_SIZE;
  const riskRows = useMemo(() => riskScores.slice(riskStart, riskStart + PAGE_SIZE), [riskScores, riskStart]);

  // 10.1 — call real API then prepend result to list
  const handleGenerate = async (campaignId: string) => {
    const newRpt = await generateReport(campaignId);
    setReports((prev) => [newRpt, ...prev]);
    setRptPage(1);
    setShowGenerate(false);
  };

  return (
    <>
      <PageHead
        title="Reports & Risk Scores"
        subtitle="AI-generated campaign reports, employee risk scores, and engagement analytics."
        actions={
          <button type="button" className="ax-btn ax-btn--primary" onClick={() => setShowGenerate(true)}>
            {ICON_PLUS}<span className="ax-btn__label">Generate Report</span>
          </button>
        }
      />

      {loading && (
        <p style={{ color: 'var(--ax-text-muted)', padding: 'var(--ax-space-4)' }}>Loading reports…</p>
      )}

      {!loading && (
      <div className="ax-dash-grid">

        {/* ── 10.3 — Reports list ─────────────────────────────────────────── */}
        <section className="ax-card ax-col--12" role="region" aria-label="Campaign reports">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">10.1 · 10.2 · 10.3 · 10.4 · 10.5</span>
              <h2 className="ax-card__title">Campaign Reports</h2>
              <p className="ax-card__subtitle">{rptTotal} report{rptTotal === 1 ? '' : 's'} · click a row to view detail and export</p>
            </div>
          </div>
          <div className="ax-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Report ID</th>
                  <th className="ax-table__th" scope="col">Campaign</th>
                  <th className="ax-table__th" scope="col">Generated</th>
                  <th className="ax-table__th" scope="col">Status</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Targeted</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Open %</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Click %</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Landing %</th>
                  <th className="ax-table__th" scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {rptRows.map((r) => (
                  <tr key={r.id} className="ax-table__row">
                    <td className="ax-table__td ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>{r.id}</td>
                    <td className="ax-table__td" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>
                      {r.campaignName}
                      <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{r.campaignId}</div>
                    </td>
                    <td className="ax-table__td" style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>{fmt(r.generatedAt)}</td>
                    <td className="ax-table__td"><StatusBadge status={r.status} /></td>
                    <td className="ax-table__td ax-table__td--num">{r.totalTargeted || '—'}</td>
                    <td className="ax-table__td ax-table__td--num">{r.status === 'ready' ? `${r.openRate}%` : '—'}</td>
                    <td className="ax-table__td ax-table__td--num">{r.status === 'ready' ? `${r.clickRate}%` : '—'}</td>
                    <td className="ax-table__td ax-table__td--num">{r.status === 'ready' ? `${r.landingRate}%` : '—'}</td>
                    <td className="ax-table__td">
                      <button
                        type="button"
                        className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                        aria-label={`View report ${r.id}`}
                        onClick={() => setViewReport(r)}
                        disabled={r.status !== 'ready'}
                      >
                        {ICON_EYE}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={rptPage} pageCount={rptPageCount} total={rptTotal} start={rptStart} size={PAGE_SIZE} onPage={setRptPage} />
        </section>

        {/* ── 10.7 — Risk score trend (line chart) ───────────────────────── */}
        <section className="ax-card ax-card--chart ax-col--8" role="region" aria-label="Risk score trend">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">10.7</span>
              <h2 className="ax-card__title">Risk Score Trend</h2>
              <p className="ax-card__subtitle">Avg. employee risk score over the last 6 months</p>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <ApexChart
              type="line"
              height={240}
              legend="none"
              ariaLabel="Line chart of average employee risk score over 6 months"
              series={[{ name: 'Avg risk score', data: riskTrend.map((p) => p.avgRiskScore) }]}
              apex={{
                colors: [cv('--ax-accent')],
                stroke: { width: 2.5, curve: 'smooth' },
                markers: { size: 5 },
                xaxis: { categories: riskTrend.map((p) => p.month) },
                yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => `${v}` } },
                tooltip: { y: { formatter: (v: number) => `${v} / 100` } },
              }}
            />
          </div>
        </section>

        {/* ── Summary KPIs beside the trend ──────────────────────────────── */}
        <section className="ax-card ax-col--4" role="region" aria-label="Risk score summary">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">Risk overview</span>
              <h2 className="ax-card__title">At a glance</h2>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <div className="ax-statgroup ax-statgroup--stack">
              {[
                { label: 'Avg risk score', value: '52', sub: '↓ from 72 in Apr' },
                { label: 'Critical employees', value: String(riskScores.filter((e) => e.riskLevel === 'critical').length) },
                { label: 'High risk', value: String(riskScores.filter((e) => e.riskLevel === 'high').length) },
                { label: 'Reports ready', value: String(reports.filter((r) => r.status === 'ready').length) },
              ].map((s) => (
                <div key={s.label} className="ax-statgroup__cell">
                  <span className="ax-statgroup__text">
                    <span className="ax-statgroup__label">{s.label}</span>
                    <span className="ax-statgroup__value ax-num">{s.value}</span>
                  </span>
                  {s.sub && <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>{s.sub}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10.8 — Department vulnerability heatmap ────────────────────── */}
        <section className="ax-card ax-col--12" role="region" aria-label="Department vulnerability heatmap">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">10.8</span>
              <h2 className="ax-card__title">Department Vulnerability Heatmap</h2>
              <p className="ax-card__subtitle">Risk score and funnel rates by department</p>
            </div>
          </div>
          <div className="ax-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Department</th>
                  <th className="ax-table__th" scope="col">Risk level</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Avg score</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Employees</th>
                  <th className="ax-table__th" scope="col">Open rate</th>
                  <th className="ax-table__th" scope="col">Click rate</th>
                  <th className="ax-table__th" scope="col">Landing rate</th>
                </tr>
              </thead>
              <tbody>
                {deptRisks.map((d) => (
                  <tr key={d.department} className="ax-table__row">
                    <td className="ax-table__td" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{d.department}</td>
                    <td className="ax-table__td"><RiskBadge level={d.riskLevel} /></td>
                    <td className="ax-table__td ax-table__td--num">
                      <span className="ax-num" style={{ fontWeight: 'var(--ax-weight-semibold)', color: d.riskLevel === 'critical' ? 'var(--ax-danger)' : d.riskLevel === 'high' ? 'var(--ax-warning)' : 'var(--ax-text-strong)' }}>
                        {d.avgRiskScore}
                      </span>
                    </td>
                    <td className="ax-table__td ax-table__td--num">{d.employeeCount}</td>
                    <td className="ax-table__td" style={{ minWidth: 120 }}>
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                        <div className="ax-progress ax-progress--sm" style={{ flex: 1 }}><div className="ax-progress__track"><div className="ax-progress__fill" style={{ width: `${d.openRate}%`, background: 'var(--ax-accent)' }} /></div></div>
                        <span className="ax-num" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)', minWidth: 32 }}>{d.openRate}%</span>
                      </div>
                    </td>
                    <td className="ax-table__td" style={{ minWidth: 120 }}>
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                        <div className="ax-progress ax-progress--sm" style={{ flex: 1 }}><div className="ax-progress__track"><div className="ax-progress__fill" style={{ width: `${d.clickRate}%`, background: 'var(--ax-viz-amber)' }} /></div></div>
                        <span className="ax-num" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)', minWidth: 32 }}>{d.clickRate}%</span>
                      </div>
                    </td>
                    <td className="ax-table__td" style={{ minWidth: 120 }}>
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                        <div className="ax-progress ax-progress--sm" style={{ flex: 1 }}><div className="ax-progress__track"><div className="ax-progress__fill" style={{ width: `${d.landingRate}%`, background: 'var(--ax-viz-violet)' }} /></div></div>
                        <span className="ax-num" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)', minWidth: 32 }}>{d.landingRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 10.6 — Employee risk scores ────────────────────────────────── */}
        <section className="ax-card ax-col--12" role="region" aria-label="Employee risk scores">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">10.6</span>
              <h2 className="ax-card__title">Employee Risk Scores</h2>
              <p className="ax-card__subtitle">{riskTotal} employees · sorted by risk score descending</p>
            </div>
          </div>
          <div className="ax-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Employee</th>
                  <th className="ax-table__th" scope="col">Department</th>
                  <th className="ax-table__th" scope="col">Risk level</th>
                  <th className="ax-table__th" scope="col">Risk score</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Campaigns</th>
                  <th className="ax-table__th" scope="col">Last event</th>
                </tr>
              </thead>
              <tbody>
                {riskRows.map((emp) => (
                  <tr key={emp.employeeId} className="ax-table__row">
                    <td className="ax-table__td">
                      <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{emp.name}</div>
                      <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>{emp.email}</div>
                    </td>
                    <td className="ax-table__td">{emp.department}</td>
                    <td className="ax-table__td"><RiskBadge level={emp.riskLevel} /></td>
                    <td className="ax-table__td" style={{ minWidth: 140 }}>
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                        <div className="ax-progress ax-progress--sm" style={{ flex: 1 }}>
                          <div className="ax-progress__track">
                            <div className="ax-progress__fill" style={{
                              width: `${emp.riskScore}%`,
                              background: emp.riskLevel === 'critical' ? 'var(--ax-danger)' : emp.riskLevel === 'high' ? 'var(--ax-warning)' : emp.riskLevel === 'medium' ? 'var(--ax-accent)' : 'var(--ax-success)',
                            }} />
                          </div>
                        </div>
                        <span className="ax-num" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)', minWidth: 28 }}>{emp.riskScore}</span>
                      </div>
                    </td>
                    <td className="ax-table__td ax-table__td--num">{emp.campaignsParticipated}</td>
                    <td className="ax-table__td" style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>{fmt(emp.lastEventAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={riskPage} pageCount={riskPageCount} total={riskTotal} start={riskStart} size={PAGE_SIZE} onPage={setRiskPage} />
        </section>

        {/* ── 10.9 — Template effectiveness ──────────────────────────────── */}
        <section className="ax-card ax-col--12" role="region" aria-label="Template effectiveness">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">10.9</span>
              <h2 className="ax-card__title">Template Effectiveness</h2>
              <p className="ax-card__subtitle">Which lure types and categories drive the highest engagement</p>
            </div>
          </div>
          <div className="ax-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Template</th>
                  <th className="ax-table__th" scope="col">Lure type</th>
                  <th className="ax-table__th" scope="col">Category</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Times used</th>
                  <th className="ax-table__th" scope="col">Avg open rate</th>
                  <th className="ax-table__th" scope="col">Avg click rate</th>
                  <th className="ax-table__th" scope="col">Avg landing rate</th>
                </tr>
              </thead>
              <tbody>
                {templateEff.map((t) => (
                  <tr key={t.templateId} className="ax-table__row">
                    <td className="ax-table__td">
                      <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{t.templateName}</div>
                      <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{t.templateId}</div>
                    </td>
                    <td className="ax-table__td"><span className="ax-badge ax-badge--soft ax-badge--pill">{t.lureType}</span></td>
                    <td className="ax-table__td"><span className="ax-badge ax-badge--soft ax-badge--pill ax-badge--accent">{t.category}</span></td>
                    <td className="ax-table__td ax-table__td--num">{t.timesUsed}</td>
                    {[t.avgOpenRate, t.avgClickRate, t.avgLandingRate].map((rate, i) => (
                      <td key={i} className="ax-table__td" style={{ minWidth: 120 }}>
                        <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                          <div className="ax-progress ax-progress--sm" style={{ flex: 1 }}>
                            <div className="ax-progress__track">
                              <div className="ax-progress__fill" style={{ width: `${rate}%`, background: i === 0 ? 'var(--ax-accent)' : i === 1 ? 'var(--ax-viz-amber)' : 'var(--ax-viz-violet)' }} />
                            </div>
                          </div>
                          <span className="ax-num" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)', minWidth: 32 }}>{rate}%</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 10.10 — Training correlation ───────────────────────────────── */}
        <section className="ax-card ax-col--12" role="region" aria-label="Training correlation">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">10.10</span>
              <h2 className="ax-card__title">Training Correlation</h2>
              <p className="ax-card__subtitle">Click-rate reduction before vs. after security awareness training, by department</p>
            </div>
          </div>
          <div className="ax-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Department</th>
                  <th className="ax-table__th" scope="col">Before training</th>
                  <th className="ax-table__th" scope="col">After training</th>
                  <th className="ax-table__th" scope="col">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {trainingCorr.map((row) => (
                  <tr key={row.department} className="ax-table__row">
                    <td className="ax-table__td" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{row.department}</td>
                    <td className="ax-table__td" style={{ minWidth: 160 }}>
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                        <div className="ax-progress ax-progress--sm" style={{ flex: 1 }}><div className="ax-progress__track"><div className="ax-progress__fill" style={{ width: `${row.preTrainingClickRate}%`, background: 'var(--ax-danger)' }} /></div></div>
                        <span className="ax-num" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)', minWidth: 32 }}>{row.preTrainingClickRate}%</span>
                      </div>
                    </td>
                    <td className="ax-table__td" style={{ minWidth: 160 }}>
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                        <div className="ax-progress ax-progress--sm" style={{ flex: 1 }}><div className="ax-progress__track"><div className="ax-progress__fill" style={{ width: `${row.postTrainingClickRate}%`, background: 'var(--ax-success)' }} /></div></div>
                        <span className="ax-num" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)', minWidth: 32 }}>{row.postTrainingClickRate}%</span>
                      </div>
                    </td>
                    <td className="ax-table__td">
                      <span className="ax-badge ax-badge--soft ax-badge--pill ax-badge--success">
                        <span className="ax-badge__dot" />−{row.improvement}pp
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
      )} {/* end !loading */}

      {/* Modals */}
      {viewReport && <ReportModal report={viewReport} onClose={() => setViewReport(null)} />}
      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onGenerate={handleGenerate} />}
    </>
  );
}

export default Reports;
