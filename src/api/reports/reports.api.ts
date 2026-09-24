/*
 * Phause — Reports & Risk Scores API (Step 10).
 *
 * All 10 endpoints wired to the confirmed backend paths from the Postman collection.
 * Every function falls back to seed data when the API call fails (network error or
 * non-2xx), so the UI stays functional while developing against a local/offline backend.
 *
 * Real endpoints (from Postman):
 *   10.1  POST   /api/reports/campaign/:campaignId/generate
 *   10.2  GET    /api/reports/:reportId
 *   10.3  GET    /api/reports
 *   10.4  GET    /api/reports/:reportId/export.csv
 *   10.5  GET    /api/reports/:reportId/export.pdf
 *   10.6  GET    /api/risk-scores
 *   10.7  GET    /api/risk-scores/trend
 *   10.8  GET    /api/risk-scores/by-department
 *   10.9  GET    /api/reports/template-effectiveness
 *   10.10 GET    /api/reports/training-correlation
 *
 * Auth: all routes use appToken (Bearer header).
 */

import { apiClient } from '../client';
import { getAppToken } from '../../stores/auth.store';
import {
  SEED_DEPARTMENT_RISKS,
  SEED_REPORTS,
  SEED_RISK_SCORES,
  SEED_RISK_TREND,
  SEED_TEMPLATE_EFFECTIVENESS,
  SEED_TRAINING_CORRELATION,
  type DepartmentRisk,
  type EmployeeRiskScore,
  type ReportSummary,
  type RiskTrendPoint,
  type TemplateEffectiveness,
  type TrainingCorrelationRow,
} from '../../pages/reports/reportsData';

// ---------------------------------------------------------------------------
// Shape adapters — normalise the backend response to our frontend types.
// The Postman collection shows the real field names; map them here.
// ---------------------------------------------------------------------------

function adaptReport(raw: Record<string, unknown>): ReportSummary {
  return {
    id:               String(raw.id ?? ''),
    campaignId:       String(raw.campaignId ?? raw.campaign_id ?? ''),
    campaignName:     String(raw.campaignName ?? raw.campaign_name ?? raw.name ?? ''),
    generatedAt:      String(raw.generatedAt ?? raw.created_at ?? new Date().toISOString()),
    status:           (raw.status as ReportSummary['status']) ?? 'ready',
    totalTargeted:    Number(raw.totalTargeted ?? raw.total_targeted ?? 0),
    openRate:         Number(raw.openRate ?? raw.open_rate ?? 0),
    clickRate:        Number(raw.clickRate ?? raw.click_rate ?? 0),
    landingRate:      Number(raw.landingRate ?? raw.landing_rate ?? 0),
    aiInsightSnippet: String(raw.aiInsight ?? raw.ai_insight ?? raw.summary ?? ''),
  };
}

function adaptRiskScore(raw: Record<string, unknown>): EmployeeRiskScore {
  const score = Number(raw.riskScore ?? raw.risk_score ?? raw.score ?? 0);
  const level = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  return {
    employeeId:            String(raw.employeeId ?? raw.employee_id ?? raw.userId ?? raw.id ?? ''),
    name:                  String(raw.name ?? raw.employeeName ?? ''),
    email:                 String(raw.email ?? ''),
    department:            String(raw.department ?? ''),
    riskScore:             score,
    riskLevel:             (raw.riskLevel ?? raw.risk_level ?? level) as EmployeeRiskScore['riskLevel'],
    lastEventAt:           String(raw.lastEventAt ?? raw.last_event_at ?? new Date().toISOString()),
    campaignsParticipated: Number(raw.campaignsParticipated ?? raw.campaigns_participated ?? 0),
  };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** 10.1 — Generate report for a campaign. Returns the new report record. */
export async function generateReport(campaignId: string): Promise<ReportSummary> {
  try {
    const raw = await apiClient.post<Record<string, unknown>>(
      `/api/reports/campaign/${encodeURIComponent(campaignId)}/generate`,
      getAppToken,
    );
    return adaptReport(raw);
  } catch {
    // Fallback: return a mock "generating" record so the UI still shows activity
    return {
      id: `RPT-${Date.now()}`,
      campaignId,
      campaignName: campaignId,
      generatedAt: new Date().toISOString(),
      status: 'generating',
      totalTargeted: 0,
      openRate: 0, clickRate: 0, landingRate: 0,
      aiInsightSnippet: 'Report generation queued (offline fallback).',
    };
  }
}

/** 10.3 — List all reports for the org. */
export async function listReports(): Promise<ReportSummary[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/reports', getAppToken);
    if (!Array.isArray(raw)) return SEED_REPORTS;
    return raw.map((r) => adaptReport(r as Record<string, unknown>));
  } catch {
    return SEED_REPORTS;
  }
}

/** 10.2 — Get a single report by ID. */
export async function getReport(reportId: string): Promise<ReportSummary | null> {
  try {
    const raw = await apiClient.get<Record<string, unknown>>(
      `/api/reports/${encodeURIComponent(reportId)}`,
      getAppToken,
    );
    return adaptReport(raw);
  } catch {
    return SEED_REPORTS.find((r) => r.id === reportId) ?? null;
  }
}

/** 10.4 — CSV export URL (authenticated download via anchor). */
export function exportCsvUrl(reportId: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  return `${base}/api/reports/${encodeURIComponent(reportId)}/export.csv`;
}

/** 10.5 — PDF export URL (authenticated download via anchor). */
export function exportPdfUrl(reportId: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  return `${base}/api/reports/${encodeURIComponent(reportId)}/export.pdf`;
}

/** 10.6 — List all employee risk scores. */
export async function listRiskScores(): Promise<EmployeeRiskScore[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/risk-scores', getAppToken);
    if (!Array.isArray(raw)) return SEED_RISK_SCORES;
    return raw.map((r) => adaptRiskScore(r as Record<string, unknown>));
  } catch {
    return SEED_RISK_SCORES;
  }
}

/** 10.7 — Risk score trend over time. */
export async function getRiskTrend(): Promise<RiskTrendPoint[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/risk-scores/trend', getAppToken);
    if (!Array.isArray(raw)) return SEED_RISK_TREND;
    return raw.map((r) => {
      const item = r as Record<string, unknown>;
      return {
        month: String(item.month ?? item.period ?? item.date ?? ''),
        avgRiskScore: Number(item.avgRiskScore ?? item.avg_risk_score ?? item.score ?? 0),
      };
    });
  } catch {
    return SEED_RISK_TREND;
  }
}

/** 10.8 — Risk scores by department (vulnerability heatmap). */
export async function getRiskByDepartment(): Promise<DepartmentRisk[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/risk-scores/by-department', getAppToken);
    if (!Array.isArray(raw)) return SEED_DEPARTMENT_RISKS;
    return raw.map((r) => {
      const item = r as Record<string, unknown>;
      const score = Number(item.avgRiskScore ?? item.avg_risk_score ?? 0);
      return {
        department:    String(item.department ?? ''),
        avgRiskScore:  score,
        employeeCount: Number(item.employeeCount ?? item.employee_count ?? item.count ?? 0),
        riskLevel:     (item.riskLevel ?? (score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low')) as DepartmentRisk['riskLevel'],
        openRate:      Number(item.openRate ?? item.open_rate ?? 0),
        clickRate:     Number(item.clickRate ?? item.click_rate ?? 0),
        landingRate:   Number(item.landingRate ?? item.landing_rate ?? 0),
      };
    });
  } catch {
    return SEED_DEPARTMENT_RISKS;
  }
}

/** 10.9 — Template effectiveness. */
export async function getTemplateEffectiveness(): Promise<TemplateEffectiveness[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/reports/template-effectiveness', getAppToken);
    if (!Array.isArray(raw)) return SEED_TEMPLATE_EFFECTIVENESS;
    return raw.map((r) => {
      const item = r as Record<string, unknown>;
      return {
        templateId:     String(item.templateId ?? item.template_id ?? item.id ?? ''),
        templateName:   String(item.templateName ?? item.name ?? ''),
        lureType:       String(item.lureType ?? item.lure_type ?? ''),
        category:       String(item.category ?? ''),
        timesUsed:      Number(item.timesUsed ?? item.times_used ?? item.usageCount ?? 0),
        avgOpenRate:    Number(item.avgOpenRate ?? item.avg_open_rate ?? 0),
        avgClickRate:   Number(item.avgClickRate ?? item.avg_click_rate ?? 0),
        avgLandingRate: Number(item.avgLandingRate ?? item.avg_landing_rate ?? 0),
      };
    });
  } catch {
    return SEED_TEMPLATE_EFFECTIVENESS;
  }
}

/** 10.10 — Training correlation. */
export async function getTrainingCorrelation(): Promise<TrainingCorrelationRow[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/reports/training-correlation', getAppToken);
    if (!Array.isArray(raw)) return SEED_TRAINING_CORRELATION;
    return raw.map((r) => {
      const item = r as Record<string, unknown>;
      const pre  = Number(item.preTrainingClickRate  ?? item.pre_training_click_rate  ?? item.before ?? 0);
      const post = Number(item.postTrainingClickRate ?? item.post_training_click_rate ?? item.after  ?? 0);
      return {
        department:            String(item.department ?? ''),
        preTrainingClickRate:  pre,
        postTrainingClickRate: post,
        improvement:           Number(item.improvement ?? (pre - post)),
      };
    });
  } catch {
    return SEED_TRAINING_CORRELATION;
  }
}
