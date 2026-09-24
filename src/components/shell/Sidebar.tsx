/*
 * Vireo React — Sidebar (manifest-driven nav tree).
 *
 * RBAC: Admin sees all nav items.
 * Org user sees only items where they hold the required permission.
 * Items with no permission requirement are always visible (e.g. Dashboard).
 */
import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { slugFromPath } from '../../lib/manifest';
import { Icon } from '../ui/Icon';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useAuthStore } from '../../stores/auth.store';

import LogoIcon from '../../image/logo.png';
import LogoText from '../../image/logo-text.png';

// ── Nav item definition ────────────────────────────────────────────────────────
interface NavItem {
  slug: string;           // route slug(s) to match for active state
  to: string;             // href
  label: string;
  icon: string;
  section: string;
  /** Permission key required. undefined = always visible (admin + org user). */
  permission?: string;
  /** Extra slugs that also mark this item active */
  alsoActive?: string[];
  /** Admin-only — never shown to org users regardless of permissions */
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  // ── Always visible ──────────────────────────────────────────────────────────
  { section: '',               slug: 'dashboard',              to: '/dashboard',              label: 'Dashboard',             icon: 'layout-dashboard' },

  // ── Organisations ───────────────────────────────────────────────────────────
  { section: 'Organisations',  slug: 'organisations/org',      to: '/organisations/org',      label: 'Org',                   icon: 'building',       permission: 'organisations:read' },
  { section: '',               slug: 'organisations/org-user', to: '/organisations/org-user', label: 'Org User',              icon: 'user',           permission: 'organisations:read' },

  // ── Employees ───────────────────────────────────────────────────────────────
  { section: 'Employees',      slug: 'employees',              to: '/employees',              label: 'Employees',             icon: 'users-group',    permission: 'employees:read' },

  // ── Templates ───────────────────────────────────────────────────────────────
  { section: 'Templates',      slug: 'templates',              to: '/templates',              label: 'Templates',             icon: 'article',        permission: 'templates:read' },

  // ── Campaigns ───────────────────────────────────────────────────────────────
  { section: 'Campaigns',      slug: 'api/campaigns',          to: '/api/campaigns',          label: 'Campaigns',             icon: 'article',        permission: 'campaigns:read',  alsoActive: ['api/campaigns/new'] },
  { section: '',               slug: 'tracking-events',        to: '/tracking-events',        label: 'Tracking Events',       icon: 'activity',       permission: 'campaigns:read' },

  // ── Reports ─────────────────────────────────────────────────────────────────
  { section: 'Reports',        slug: 'reports',                to: '/reports',                label: 'Reports & Risk Scores', icon: 'files',          permission: 'reports:read' },

  // ── Training ────────────────────────────────────────────────────────────────
  { section: 'Training',       slug: 'training',               to: '/training',               label: 'Training & Remediation',icon: 'school',         permission: 'training:read' },

  // ── Billing ─────────────────────────────────────────────────────────────────
  { section: 'Billing',        slug: 'billing',                to: '/billing',                label: 'Billing & Plans',       icon: 'credit-card',    permission: 'billing:read' },

  // ── Access Control (admin-only) ──────────────────────────────────────────────
  { section: 'Access Control', slug: 'rbac',                   to: '/rbac',                   label: 'Roles & Permissions',   icon: 'shield-lock',    adminOnly: true },
];

export function Sidebar({ drawerOpen = false }: { drawerOpen?: boolean }) {
  const location   = useLocation();
  const activeSlug = slugFromPath(location.pathname);
  const [filter, setFilter] = useState('');
  const rootRef = useRef<HTMLElement>(null);
  useFocusTrap(rootRef, drawerOpen, '.ax-sidebar__filter');

  const userRole    = useAuthStore((s) => s.userRole);
  const permissions = useAuthStore((s) => s.permissions);

  const isAdmin = userRole === 'admin' || userRole === null; // null = not logged in, show all (guard elsewhere)

  /** Decide whether an item should be shown */
  function canSee(item: NavItem): boolean {
    if (item.adminOnly) return isAdmin;
    if (!item.permission) return true;       // always visible
    if (isAdmin) return true;                // admin sees everything
    return permissions.includes(item.permission);
  }

  // Derive which sections to render (only sections that have ≥1 visible item)
  const visibleItems = NAV_ITEMS.filter(canSee).filter((item) => {
    if (!filter.trim()) return true;
    return item.label.toLowerCase().includes(filter.toLowerCase()) ||
           item.slug.includes(filter.toLowerCase());
  });

  // Group by section preserving order, collapsing empty sections
  const rendered: React.ReactNode[] = [];
  let lastSection = '';

  for (const item of visibleItems) {
    if (item.section && item.section !== lastSection) {
      rendered.push(
        <p key={`sec-${item.section}`} className="ax-sidebar__section" role="presentation">
          {item.section}
        </p>,
      );
      lastSection = item.section;
    }

    const slugs = [item.slug, ...(item.alsoActive ?? [])];
    const isActive = slugs.some((s) =>
      s.includes('*') ? activeSlug.startsWith(s.replace('*', '')) : activeSlug === s,
    );

    rendered.push(
      <Link
        key={item.slug}
        className={`ax-nav__item ax-nav__item--child${isActive ? ' ax-nav__item--active is-active' : ''}`}
        role="treeitem"
        aria-level={item.section ? 2 : 1}
        aria-current={isActive ? 'page' : undefined}
        to={item.to}
        tabIndex={isActive ? 0 : -1}
      >
        <Icon name={item.icon} className="ax-nav__icon" />
        <span className="ax-nav__label">{item.label}</span>
      </Link>,
    );
  }

  // Dashboard always gets its own top-level style
  // (already handled above via aria-level but keep the parent class for the first item)

  return (
    <aside className="ax-sidebar" role="navigation" aria-label="Primary" ref={rootRef}>
      {/* ===== BRAND ===== */}
      <div className="ax-sidebar__brand">
        <Link className="ax-sidebar__logo" to="/" aria-label="Phause home">
          <span className="ax-sidebar__mark" aria-hidden="true">
            <img className="ax-icon w-40" src={LogoIcon} alt="" />
          </span>
          <span className="ax-sidebar__wordmark"><img src={LogoText} alt="" className="w-36" /></span>
        </Link>
      </div>

      {/* ===== MENU FILTER ===== */}
      <div className="ax-sidebar__search">
        <svg className="ax-icon ax-sidebar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true">
          <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
          <path d="M21 21l-6 -6" />
        </svg>
        <input
          type="search"
          className="ax-sidebar__filter"
          placeholder="Filter menu…"
          aria-label="Filter menu"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setFilter('')}
        />
        {filter && (
          <button type="button" className="ax-sidebar__filter-clear" onClick={() => setFilter('')} aria-label="Clear filter">
            <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true">
              <path d="M18 6l-12 12" /><path d="M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ===== NAV TREE ===== */}
      <nav className="ax-sidebar__nav" role="tree" aria-label="Main menu">

        {/* Dashboard (top-level, always visible) */}
        {canSee(NAV_ITEMS[0]) && (
          <Link
            className={`ax-nav__item ax-nav__item--parent${activeSlug === 'dashboard' || activeSlug === '' ? ' ax-nav__item--active is-active' : ''}`}
            role="treeitem"
            aria-level={1}
            aria-current={activeSlug === 'dashboard' || activeSlug === '' ? 'page' : undefined}
            to="/dashboard"
            tabIndex={activeSlug === 'dashboard' || activeSlug === '' ? 0 : -1}
          >
            <Icon name="layout-dashboard" className="ax-nav__icon" />
            <span className="ax-nav__label">Dashboard</span>
          </Link>
        )}

        {/* All other items (skip dashboard — index 0) */}
        {rendered.slice(1)}

        {/* No access message for org users with no permissions */}
        {!isAdmin && visibleItems.length <= 1 && (
          <div style={{ padding: 'var(--ax-space-4) var(--ax-space-5)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', lineHeight: 1.6 }}>
            No modules assigned yet. Contact your admin to request access.
          </div>
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;
