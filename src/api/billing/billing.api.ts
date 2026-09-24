/*
 * Phause — Billing API (Extras — Plans & Subscriptions).
 *
 * All routes use appToken (Bearer).
 * Endpoints:
 *   POST   /api/billing/plans                     — Create plan
 *   GET    /api/billing/plans                     — List plans
 *   POST   /api/billing/checkout                  — Create Stripe checkout session
 *   GET    /api/billing/subscription              — Get current subscription
 *   POST   /api/billing/subscription/cancel       — Cancel subscription
 */

import { apiClient } from '../client';
import { getAppToken } from '../../stores/auth.store';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceCurrency: string;
  features: string[];
  maxEmployees: number | null;
  maxCampaigns: number | null;
  stripePriceId: string;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'none';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export type BillingPlanFormValues = Omit<BillingPlan, 'id'>;

// ── Adapters ──────────────────────────────────────────────────────────────────

function adaptPlan(raw: Record<string, unknown>): BillingPlan {
  return {
    id:            String(raw.id ?? ''),
    name:          String(raw.name ?? ''),
    description:   String(raw.description ?? ''),
    priceMonthly:  Number(raw.priceMonthly ?? raw.price_monthly ?? raw.price ?? 0),
    priceCurrency: String(raw.priceCurrency ?? raw.price_currency ?? raw.currency ?? 'USD'),
    features:      Array.isArray(raw.features) ? (raw.features as string[]) : [],
    maxEmployees:  raw.maxEmployees != null ? Number(raw.maxEmployees) : raw.max_employees != null ? Number(raw.max_employees) : null,
    maxCampaigns:  raw.maxCampaigns != null ? Number(raw.maxCampaigns) : raw.max_campaigns != null ? Number(raw.max_campaigns) : null,
    stripePriceId: String(raw.stripePriceId ?? raw.stripe_price_id ?? ''),
  };
}

function adaptSubscription(raw: Record<string, unknown>): Subscription {
  return {
    id:                   String(raw.id ?? ''),
    planId:               String(raw.planId ?? raw.plan_id ?? ''),
    planName:             String(raw.planName ?? raw.plan_name ?? ''),
    status:               (raw.status ?? 'none') as Subscription['status'],
    currentPeriodStart:   String(raw.currentPeriodStart ?? raw.current_period_start ?? new Date().toISOString()),
    currentPeriodEnd:     String(raw.currentPeriodEnd ?? raw.current_period_end ?? new Date().toISOString()),
    cancelAtPeriodEnd:    Boolean(raw.cancelAtPeriodEnd ?? raw.cancel_at_period_end ?? false),
    stripeSubscriptionId: raw.stripeSubscriptionId ? String(raw.stripeSubscriptionId) : raw.stripe_subscription_id ? String(raw.stripe_subscription_id) : null,
  };
}

// ── Seed data (offline fallback) ──────────────────────────────────────────────

export const SEED_PLANS: BillingPlan[] = [
  {
    id: 'PLAN-001',
    name: 'Starter',
    description: 'Perfect for small teams getting started with security awareness.',
    priceMonthly: 49,
    priceCurrency: 'USD',
    features: ['Up to 50 employees', '5 campaigns/month', 'Basic templates', 'Email reports'],
    maxEmployees: 50,
    maxCampaigns: 5,
    stripePriceId: 'price_starter',
  },
  {
    id: 'PLAN-002',
    name: 'Professional',
    description: 'For growing organisations that need more power and insights.',
    priceMonthly: 149,
    priceCurrency: 'USD',
    features: ['Up to 500 employees', 'Unlimited campaigns', 'Custom templates', 'AI-powered reports', 'Training modules', 'Risk scoring'],
    maxEmployees: 500,
    maxCampaigns: null,
    stripePriceId: 'price_professional',
  },
  {
    id: 'PLAN-003',
    name: 'Enterprise',
    description: 'Full-scale deployment for large enterprises with compliance needs.',
    priceMonthly: 499,
    priceCurrency: 'USD',
    features: ['Unlimited employees', 'Unlimited campaigns', 'Custom templates', 'AI-powered reports', 'Training & LMS', 'Risk scoring', 'SSO / SAML', 'Dedicated support', 'SLA guarantee'],
    maxEmployees: null,
    maxCampaigns: null,
    stripePriceId: 'price_enterprise',
  },
];

export const SEED_SUBSCRIPTION: Subscription = {
  id: 'SUB-001',
  planId: 'PLAN-002',
  planName: 'Professional',
  status: 'active',
  currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  currentPeriodEnd:   new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd:  false,
  stripeSubscriptionId: 'sub_example123',
};

// ── API functions ─────────────────────────────────────────────────────────────

/** Create a billing plan */
export async function createBillingPlan(values: BillingPlanFormValues): Promise<BillingPlan> {
  try {
    const raw = await apiClient.post<Record<string, unknown>>(
      '/api/billing/plans', getAppToken, values,
    );
    return adaptPlan(raw);
  } catch {
    return { ...values, id: `PLAN-${Date.now()}` };
  }
}

/** List all billing plans */
export async function listBillingPlans(): Promise<BillingPlan[]> {
  try {
    const raw = await apiClient.get<unknown[]>('/api/billing/plans', getAppToken);
    if (!Array.isArray(raw)) return SEED_PLANS;
    return raw.map((r) => adaptPlan(r as Record<string, unknown>));
  } catch {
    return SEED_PLANS;
  }
}

/** Create a Stripe checkout session for a given plan */
export async function createCheckoutSession(planId: string): Promise<CheckoutSession> {
  const raw = await apiClient.post<Record<string, unknown>>(
    '/api/billing/checkout', getAppToken, { planId },
  );
  return {
    sessionId: String(raw.sessionId ?? raw.session_id ?? raw.id ?? ''),
    url:       String(raw.url ?? raw.checkoutUrl ?? raw.checkout_url ?? ''),
  };
}

/** Get the current subscription for the org */
export async function getCurrentSubscription(): Promise<Subscription> {
  try {
    const raw = await apiClient.get<Record<string, unknown>>(
      '/api/billing/subscription', getAppToken,
    );
    return adaptSubscription(raw);
  } catch {
    return SEED_SUBSCRIPTION;
  }
}

/** Cancel the current subscription (at period end) */
export async function cancelSubscription(): Promise<Subscription> {
  try {
    const raw = await apiClient.post<Record<string, unknown>>(
      '/api/billing/subscription/cancel', getAppToken,
    );
    return adaptSubscription(raw);
  } catch {
    return { ...SEED_SUBSCRIPTION, cancelAtPeriodEnd: true };
  }
}
