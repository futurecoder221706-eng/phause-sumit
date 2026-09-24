/*
 * Phause — Reports & Risk Scores: types, seed data, and endpoint constants.
 *
 * Covers all 10 sub-items in Step 10:
 *   10.1  POST /api/reports/generate          — Generate AI report for a campaign → returns reportId
 *   10.2  GET  /api/reports/:reportId          — View a single report
 *   10.3  GET  /api/reports                   — List all reports
 *   10.4  GET  /api/reports/:reportId/export/csv  — Export report as CSV
 *   10.5  GET  /api/reports/:reportId/export/pdf  — Export report as PDF
 *   10.6  GET  /api/risk-scores               — List risk scores (all employees)
 *   10.7  GET  /api/risk-scores/trend         — Risk score trend over time
 *   10.8  GET  /api/risk-scores/by-department — Risk scores by department (vulnerability heatmap)
 *   10.9  GET  /api/reports/template-effectiveness — Template effectiveness (lure types)
 *   10.10 GET  /api/reports/training-correlation   — Training correlation (before vs after)
 *
 * All endpoints are PLACEHOLDER ASSUMPTIONS — confirm/replace paths before
 * wiring to the real API. Seed data stands in for all fetches.
 */

// ---------------------------------------------------------------------------
// Endpoint constants (PLACEHOLDER — confirm before API integration)
// ---------------------------------------------------------------------------

export const REPORT_ENDPOINTS = {
  generate:               '/api/reports/generate',
  list:                   '/api/reports',
  detail:                 (id: string) => `/api/reports/${encodeURIComponent(id)}`,
  exportCsv:              (id: string) => `/api/reports/${encodeURIComponent(id)}/export/csv`,
  exportPdf:              (id: string) => `/api/reports/${encodeURIComponent(id)}/export/pdf`,
  riskScores:             '/api/risk-scores',
  riskTrend:              '/api/risk-scores/trend',
  riskByDepartment:       '/api/risk-scores/by-department',
  templateEffectiveness:  '/api/reports/template-effectiveness',
  trainingCorrelation:    '/api/reports/training-correlation',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportStatus = 'generating' | 'ready' | 'failed';

/** Summary record returned by the list endpoint (10.3). */
export interface ReportSummary {
  id: string;
  campaignId: string;
  campaignName: string;
  generatedAt: string;   // ISO timestamp
  status: ReportStatus;
  totalTargeted: number;
  openRate: number;      // 0–100
  clickRate: number;     // 0–100
  landingRate: number;   // 0–100
  aiInsightSnippet: string;
}

/** Full report returned by the detail endpoint (10.2). */
export interface ReportDetail extends ReportSummary {
  aiInsightFull: string;
  recommendations: string[];
  exportCsvUrl: string;
  exportPdfUrl: string;
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

/** Per-employee risk score record (10.6). */
export interface EmployeeRiskScore {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  riskScore: number;     // 0–100
  riskLevel: RiskLevel;
  lastEventAt: string;   // ISO timestamp
  campaignsParticipated: number;
}

/** Single data point for the risk trend chart (10.7). */
export interface RiskTrendPoint {
  month: string;         // e.g. "Sep 2026"
  avgRiskScore: number;
}

/** Department-level vulnerability entry for the heatmap (10.8). */
export interface DepartmentRisk {
  department: string;
  avgRiskScore: number;
  employeeCount: number;
  riskLevel: RiskLevel;
  openRate: number;
  clickRate: number;
  landingRate: number;
}

/** Template effectiveness entry (10.9). */
export interface TemplateEffectiveness {
  templateId: string;
  templateName: string;
  lureType: string;
  category: string;
  timesUsed: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgLandingRate: number;
}

/** Training correlation row (10.10). */
export interface TrainingCorrelationRow {
  department: string;
  preTrainingClickRate: number;
  postTrainingClickRate: number;
  improvement: number;   // percentage-point reduction
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Seed data — swap all for real fetches once the API is confirmed
// ---------------------------------------------------------------------------

export const SEED_REPORTS: ReportSummary[] = [
  {
    id: 'RPT-1001', campaignId: 'CMP-1003', campaignName: 'Security Team Baseline',
    generatedAt: '2026-09-12T10:00:00.000Z', status: 'ready',
    totalTargeted: 42, openRate: 88, clickRate: 55, landingRate: 31,
    aiInsightSnippet: 'High click-through on security-themed lures suggests employees need refreshed authentication training.',
  },
  {
    id: 'RPT-1002', campaignId: 'CMP-1002', campaignName: 'Finance Invoice Drill',
    generatedAt: '2026-09-20T14:30:00.000Z', status: 'ready',
    totalTargeted: 18, openRate: 94, clickRate: 72, landingRate: 44,
    aiInsightSnippet: 'Finance team is highly susceptible to authority-based invoice lures. Recommend targeted spear-phishing awareness module.',
  },
  {
    id: 'RPT-1003', campaignId: 'CMP-1001', campaignName: 'Q3 Password Awareness',
    generatedAt: '2026-09-24T08:00:00.000Z', status: 'generating',
    totalTargeted: 120, openRate: 0, clickRate: 0, landingRate: 0,
    aiInsightSnippet: 'Report generation in progress…',
  },
];

export const SEED_RISK_SCORES: EmployeeRiskScore[] = [
  { employeeId: 'EMP-1001', name: 'Bob Jones',    email: 'bob@acme.com',         department: 'HR',        riskScore: 78, riskLevel: 'critical', lastEventAt: '2026-09-18T13:20:00.000Z', campaignsParticipated: 3 },
  { employeeId: 'EMP-1002', name: 'Carol White',  email: 'carol@acme.com',        department: 'IT',        riskScore: 42, riskLevel: 'medium',   lastEventAt: '2026-09-18T09:45:00.000Z', campaignsParticipated: 2 },
  { employeeId: 'EMP-1003', name: 'Dave Brown',   email: 'dave@acme.com',         department: 'Finance',   riskScore: 85, riskLevel: 'critical', lastEventAt: '2026-09-20T16:10:00.000Z', campaignsParticipated: 2 },
  { employeeId: 'EMP-1004', name: 'Maya Patel',   email: 'maya@northwind.io',     department: 'Security',  riskScore: 12, riskLevel: 'low',      lastEventAt: '2026-09-11T10:00:00.000Z', campaignsParticipated: 1 },
  { employeeId: 'EMP-1005', name: 'Liam Smith',   email: 'liam@globex.co',        department: 'Operations',riskScore: 61, riskLevel: 'high',     lastEventAt: '2026-09-18T11:30:00.000Z', campaignsParticipated: 2 },
  { employeeId: 'EMP-1006', name: 'Priya Nair',   email: 'priya@initech.dev',     department: 'Finance',   riskScore: 80, riskLevel: 'critical', lastEventAt: '2026-09-20T15:50:00.000Z', campaignsParticipated: 2 },
  { employeeId: 'EMP-1007', name: 'James Osei',   email: 'james@acme.com',        department: 'HR',        riskScore: 55, riskLevel: 'high',     lastEventAt: '2026-09-18T14:00:00.000Z', campaignsParticipated: 3 },
  { employeeId: 'EMP-1008', name: 'Sofia Reyes',  email: 'sofia@northwind.io',    department: 'Marketing', riskScore: 48, riskLevel: 'medium',   lastEventAt: '2026-09-12T09:00:00.000Z', campaignsParticipated: 1 },
  { employeeId: 'EMP-1009', name: 'Aaron Levy',   email: 'aaron@globex.co',       department: 'IT',        riskScore: 22, riskLevel: 'low',      lastEventAt: '2026-09-11T10:30:00.000Z', campaignsParticipated: 1 },
  { employeeId: 'EMP-1010', name: 'Nadia Kumar',  email: 'nadia@initech.dev',     department: 'Operations',riskScore: 67, riskLevel: 'high',     lastEventAt: '2026-09-18T12:45:00.000Z', campaignsParticipated: 2 },
  { employeeId: 'EMP-1011', name: 'Tom Fischer',  email: 'tom@acme.com',          department: 'Finance',   riskScore: 73, riskLevel: 'high',     lastEventAt: '2026-09-20T14:20:00.000Z', campaignsParticipated: 2 },
  { employeeId: 'EMP-1012', name: 'Amara Diallo', email: 'amara@northwind.io',    department: 'Marketing', riskScore: 35, riskLevel: 'medium',   lastEventAt: '2026-09-12T09:45:00.000Z', campaignsParticipated: 1 },
];

export const SEED_RISK_TREND: RiskTrendPoint[] = [
  { month: 'Apr 2026', avgRiskScore: 72 },
  { month: 'May 2026', avgRiskScore: 68 },
  { month: 'Jun 2026', avgRiskScore: 65 },
  { month: 'Jul 2026', avgRiskScore: 60 },
  { month: 'Aug 2026', avgRiskScore: 55 },
  { month: 'Sep 2026', avgRiskScore: 52 },
];

export const SEED_DEPARTMENT_RISKS: DepartmentRisk[] = [
  { department: 'Finance',    avgRiskScore: 79, employeeCount: 3, riskLevel: 'critical', openRate: 93, clickRate: 70, landingRate: 43 },
  { department: 'HR',         avgRiskScore: 67, employeeCount: 2, riskLevel: 'high',     openRate: 88, clickRate: 55, landingRate: 28 },
  { department: 'Operations', avgRiskScore: 64, employeeCount: 2, riskLevel: 'high',     openRate: 82, clickRate: 50, landingRate: 25 },
  { department: 'Marketing',  avgRiskScore: 42, employeeCount: 2, riskLevel: 'medium',   openRate: 75, clickRate: 38, landingRate: 18 },
  { department: 'IT',         avgRiskScore: 32, employeeCount: 2, riskLevel: 'medium',   openRate: 70, clickRate: 28, landingRate: 12 },
  { department: 'Security',   avgRiskScore: 12, employeeCount: 1, riskLevel: 'low',      openRate: 55, clickRate: 10, landingRate: 5  },
];

export const SEED_TEMPLATE_EFFECTIVENESS: TemplateEffectiveness[] = [
  { templateId: 'TPL-1002', templateName: 'Finance Invoice Review',    lureType: 'Authority', category: 'Attachment',         timesUsed: 2, avgOpenRate: 93, avgClickRate: 70, avgLandingRate: 43 },
  { templateId: 'TPL-1003', templateName: 'Security Alert Verification', lureType: 'Urgency',   category: 'Credential harvest', timesUsed: 2, avgOpenRate: 88, avgClickRate: 55, avgLandingRate: 31 },
  { templateId: 'TPL-1001', templateName: 'Urgent IT Password Reset',  lureType: 'Urgency',   category: 'Credential harvest', timesUsed: 1, avgOpenRate: 82, avgClickRate: 48, avgLandingRate: 26 },
];

export const SEED_TRAINING_CORRELATION: TrainingCorrelationRow[] = [
  { department: 'Finance',    preTrainingClickRate: 70, postTrainingClickRate: 42, improvement: 28 },
  { department: 'HR',         preTrainingClickRate: 55, postTrainingClickRate: 38, improvement: 17 },
  { department: 'Operations', preTrainingClickRate: 50, postTrainingClickRate: 36, improvement: 14 },
  { department: 'Marketing',  preTrainingClickRate: 38, postTrainingClickRate: 29, improvement:  9 },
  { department: 'IT',         preTrainingClickRate: 28, postTrainingClickRate: 22, improvement:  6 },
  { department: 'Security',   preTrainingClickRate: 10, postTrainingClickRate:  8, improvement:  2 },
];

// Re-export helper for consumers
export { riskLevel };
