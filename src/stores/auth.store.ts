/*
 * Phause — Auth token store (Zustand).
 *
 * Holds both token types from the Postman collection:
 *   adminToken — from POST /admin/login  (super-admin routes)
 *   appToken   — from POST /api/auth/login  (org-user routes)
 *
 * Tokens are persisted to sessionStorage so they survive page refreshes
 * within the same browser tab but are cleared when the tab closes.
 *
 * Usage:
 *   const { appToken, setAppToken } = useAuthStore();
 *   // or as a getter (outside React):
 *   import { getAppToken } from '../stores/auth.store';
 */

import { create } from 'zustand';

export type UserRole = 'admin' | 'org_user' | null;

interface AuthState {
  adminToken: string | null;
  appToken: string | null;
  orgId: string | null;
  /** Which type of user is currently signed in */
  userRole: UserRole;
  /** Permissions granted to the signed-in org user (empty for admin) */
  permissions: string[];
  setAdminToken: (token: string) => void;
  setAppToken: (token: string, orgId?: string, permissions?: string[]) => void;
  setOrgId: (id: string) => void;
  setPermissions: (permissions: string[]) => void;
  clearAll: () => void;
}

const SS_ADMIN       = 'phause_adminToken';
const SS_APP         = 'phause_appToken';
const SS_ORG         = 'phause_orgId';
const SS_ROLE        = 'phause_userRole';
const SS_PERMISSIONS = 'phause_permissions';

function loadPermissions(): string[] {
  try { return JSON.parse(sessionStorage.getItem(SS_PERMISSIONS) ?? '[]'); } catch { return []; }
}

export const useAuthStore = create<AuthState>((set) => ({
  adminToken:  sessionStorage.getItem(SS_ADMIN),
  appToken:    sessionStorage.getItem(SS_APP),
  orgId:       sessionStorage.getItem(SS_ORG),
  userRole:    (sessionStorage.getItem(SS_ROLE) as UserRole) ?? null,
  permissions: loadPermissions(),

  setAdminToken: (token) => {
    sessionStorage.setItem(SS_ADMIN, token);
    sessionStorage.setItem(SS_ROLE, 'admin');
    set({ adminToken: token, userRole: 'admin', permissions: [] });
  },
  setAppToken: (token, orgId, permissions = []) => {
    sessionStorage.setItem(SS_APP, token);
    sessionStorage.setItem(SS_ROLE, 'org_user');
    sessionStorage.setItem(SS_PERMISSIONS, JSON.stringify(permissions));
    set({ appToken: token, userRole: 'org_user', permissions });
    if (orgId) {
      sessionStorage.setItem(SS_ORG, orgId);
      set({ orgId });
    }
  },
  setOrgId: (id) => {
    sessionStorage.setItem(SS_ORG, id);
    set({ orgId: id });
  },
  setPermissions: (permissions) => {
    sessionStorage.setItem(SS_PERMISSIONS, JSON.stringify(permissions));
    set({ permissions });
  },
  clearAll: () => {
    [SS_ADMIN, SS_APP, SS_ORG, SS_ROLE, SS_PERMISSIONS].forEach((k) =>
      sessionStorage.removeItem(k),
    );
    set({ adminToken: null, appToken: null, orgId: null, userRole: null, permissions: [] });
  },
}));

/** Getters for use outside React components (e.g. in API modules). */
export const getAppToken   = () => useAuthStore.getState().appToken;
export const getAdminToken = () => useAuthStore.getState().adminToken;

/** Returns true if the current user has a given permission */
export const hasPermission = (permission: string) =>
  useAuthStore.getState().permissions.includes(permission);
