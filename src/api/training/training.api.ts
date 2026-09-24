/*
 * Phause — Training & Remediation API (Step 11).
 *
 * All routes use appToken (Bearer).
 * Endpoints:
 *   11.1  POST   /api/training/modules              — Create training module
 *   11.2  GET    /api/training/modules              — List training modules
 *   11.3  GET    /api/training/enrolments           — List training enrolments (who needs to do training)
 *   11.4  POST   /api/training/completions          — Record training completion
 *   11.5  GET    /api/training/completions/:employeeId — List completions for an employee
 */

import { apiClient } from '../client';
import { getAppToken } from '../../stores/auth.store';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  category: string;
  mandatory: boolean;
  createdAt: string;
}

export interface TrainingEnrolment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  moduleId: string;
  moduleTitle: string;
  enrolledAt: string;
  dueAt: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

export interface TrainingCompletion {
  id: string;
  employeeId: string;
  moduleId: string;
  moduleTitle: string;
  completedAt: string;
  score: number | null;
  passed: boolean;
}

export type TrainingModuleFormValues = Omit<TrainingModule, 'id' | 'createdAt'>;

// ── Adapters ──────────────────────────────────────────────────────────────────

function adaptModule(raw: Record<string, unknown>): TrainingModule {
  return {
    id:              String(raw.id ?? ''),
    title:           String(raw.title ?? raw.name ?? ''),
    description:     String(raw.description ?? ''),
    durationMinutes: Number(raw.durationMinutes ?? raw.duration_minutes ?? raw.duration ?? 0),
    category:        String(raw.category ?? 'general'),
    mandatory:       Boolean(raw.mandatory ?? raw.required ?? false),
    createdAt:       String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
  };
}

function adaptEnrolment(raw: Record<string, unknown>): TrainingEnrolment {
  return {
    id:            String(raw.id ?? ''),
    employeeId:    String(raw.employeeId ?? raw.employee_id ?? ''),
    employeeName:  String(raw.employeeName ?? raw.employee_name ?? raw.name ?? ''),
    employeeEmail: String(raw.employeeEmail ?? raw.employee_email ?? raw.email ?? ''),
    moduleId:      String(raw.moduleId ?? raw.module_id ?? ''),
    moduleTitle:   String(raw.moduleTitle ?? raw.module_title ?? raw.title ?? ''),
    enrolledAt:    String(raw.enrolledAt ?? raw.enrolled_at ?? new Date().toISOString()),
    dueAt:         raw.dueAt ? String(raw.dueAt) : raw.due_at ? String(raw.due_at) : null,
    status:        (raw.status ?? 'pending') as TrainingEnrolment['status'],
  };
}

function adaptCompletion(raw: Record<string, unknown>): TrainingCompletion {
  return {
    id:          String(raw.id ?? ''),
    employeeId:  String(raw.employeeId ?? raw.employee_id ?? ''),
    moduleId:    String(raw.moduleId ?? raw.module_id ?? ''),
    moduleTitle: String(raw.moduleTitle ?? raw.module_title ?? raw.title ?? ''),
    completedAt: String(raw.completedAt ?? raw.completed_at ?? new Date().toISOString()),
    score:       raw.score != null ? Number(raw.score) : null,
    passed:      Boolean(raw.passed ?? raw.pass ?? true),
  };
}

// ── Seed data (offline fallback) ──────────────────────────────────────────────

export const SEED_MODULES: TrainingModule[] = [
  { id: 'TM-001', title: 'Phishing Awareness 101', description: 'Learn to identify and report phishing emails.', durationMinutes: 30, category: 'Phishing', mandatory: true, createdAt: new Date().toISOString() },
  { id: 'TM-002', title: 'Password Hygiene', description: 'Best practices for creating and managing secure passwords.', durationMinutes: 20, category: 'Passwords', mandatory: true, createdAt: new Date().toISOString() },
  { id: 'TM-003', title: 'Social Engineering Defence', description: 'Recognise manipulation tactics used by attackers.', durationMinutes: 45, category: 'Social Engineering', mandatory: false, createdAt: new Date().toISOString() },
];

export const SEED_ENROLMENTS: TrainingEnrolment[] = [
  { id: 'EN-001', employeeId: 'EMP-1001', employeeName: 'Bob Jones', employeeEmail: 'bob@acme.com', moduleId: 'TM-001', moduleTitle: 'Phishing Awareness 101', enrolledAt: new Date().toISOString(), dueAt: null, status: 'pending' },
  { id: 'EN-002', employeeId: 'EMP-1002', employeeName: 'Carol White', employeeEmail: 'carol@acme.com', moduleId: 'TM-001', moduleTitle: 'Phishing Awareness 101', enrolledAt: new Date().toISOString(), dueAt: null, status: 'in_progress' },
  { id: 'EN-003', employeeId: 'EMP-1003', employeeName: 'Dave Brown', employeeEmail: 'dave@acme.com', moduleId: 'TM-002', moduleTitle: 'Password Hygiene', enrolledAt: new Date().toISOString(), dueAt: null, status: 'completed' },
];

// ── API functions ─────────────────────────────────────────────────────────────

/** 11.1 — Create a training module */
export async function createTrainingModule(values: TrainingModuleFormValues): Promise<TrainingModule> {
  try {
    const raw = await apiClient.post<Record<string, unknown>>(
      '/api/training/modules', getAppToken, values,
    );
    return adaptModule(raw);
  } catch {
    return { ...values, id: `TM-${Date.now()}`, createdAt: new Date().toISOString() };
  }
}

/** 11.2 — List all training modules */
export async function listTrainingModules(): Promise<TrainingModule[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/training/modules', getAppToken);
    if (!Array.isArray(raw)) return SEED_MODULES;
    return raw.map((r) => adaptModule(r as Record<string, unknown>));
  } catch {
    return SEED_MODULES;
  }
}

/** 11.3 — List training enrolments (who needs to do training) */
export async function listTrainingEnrolments(): Promise<TrainingEnrolment[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/training/enrolments', getAppToken);
    if (!Array.isArray(raw)) return SEED_ENROLMENTS;
    return raw.map((r) => adaptEnrolment(r as Record<string, unknown>));
  } catch {
    return SEED_ENROLMENTS;
  }
}

/** 11.4 — Record a training completion */
export async function recordTrainingCompletion(payload: {
  employeeId: string;
  moduleId: string;
  score?: number;
  passed?: boolean;
}): Promise<TrainingCompletion> {
  try {
    const raw = await apiClient.post<Record<string, unknown>>(
      '/api/training/completions', getAppToken, {
        employeeId: payload.employeeId,
        moduleId:   payload.moduleId,
        score:      payload.score ?? null,
        passed:     payload.passed ?? true,
        completedAt: new Date().toISOString(),
      },
    );
    return adaptCompletion(raw);
  } catch {
    return {
      id: `COMP-${Date.now()}`,
      employeeId:  payload.employeeId,
      moduleId:    payload.moduleId,
      moduleTitle: '',
      completedAt: new Date().toISOString(),
      score:       payload.score ?? null,
      passed:      payload.passed ?? true,
    };
  }
}

/** 11.5 — List completions for a specific employee */
export async function listCompletionsForEmployee(employeeId: string): Promise<TrainingCompletion[]> {
  try {
    const raw = await apiClient.get<unknown[]>(
      `/api/training/completions/${encodeURIComponent(employeeId)}`, getAppToken,
    );
    if (!Array.isArray(raw)) return [];
    return raw.map((r) => adaptCompletion(r as Record<string, unknown>));
  } catch {
    return [];
  }
}
