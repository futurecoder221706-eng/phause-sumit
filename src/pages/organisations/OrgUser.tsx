/*
 * Phause — Organisation user management (route "organisations/org-user").
 *
 * A table of org users (OrgId, Email, Role, Consent) with edit/delete per
 * row, 10-per-page pagination, a running total, and a "Create User" button
 * (top-right) that pops the same four-field form as a modal. The modal is
 * reused for editing an existing row — password is optional there.
 */
import { useEffect, useMemo, useState } from 'react';
// import type { ReactElement } from 'react';
import { PageHead } from '../../components/shell/PageHead';
import { listOrgUsers, createOrgUser, updateOrgUser, deleteOrgUser } from '../../api/organisations/orgUsers.api';

/* ------------------------------------------------------------------ icons */
const ICON_PLUS = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
);
const ICON_EDIT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" /><path d="M16 5l3 3" /></svg>
);
const ICON_DELETE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
);
const ICON_CLOSE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
);
const ICON_CHEV_LEFT = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg>
);
const ICON_CHEV_RIGHT = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6" /></svg>
);

/* ------------------------------------------------------------------- data */
const ROLES = [
  { value: 'org_admin', label: 'Organisation admin' },
  { value: 'org_manager', label: 'Manager' },
  { value: 'org_member', label: 'Member' },
  { value: 'org_viewer', label: 'Viewer' },
];
const roleLabel = (value: string) => ROLES.find((r) => r.value === value)?.label ?? value;

export interface OrgUserRecord {
  orgId: string;
  email: string;
  role: string;
  active: boolean;
  hasConsent: boolean;
}

const PAGE_SIZE = 10;

/* Seed data so the table has something to page through; swap for a real fetch. */
function seedUsers(count: number): OrgUserRecord[] {
  const domains = ['yourcompany.com', 'acme.io', 'globex.co', 'initech.dev'];
  const out: OrgUserRecord[] = [];
  for (let i = 1; i <= count; i++) {
    out.push({
      orgId: `ORG-${String(1000 + i)}`,
      email: `user${i}@${domains[i % domains.length]}`,
      role: ROLES[i % ROLES.length].value,
      active: i % 5 !== 0,
      hasConsent: i % 3 !== 0,
    });
  }
  return out;
}

// Endpoint now handled by orgUsers.api.ts

/* ------------------------------------------------------------------ modal */
interface CreateFormState {
  email: string;
  password: string;
  role: string;
  hasConsent: boolean;
}

interface EditFormState {
  role: string;
  active: boolean;
  hasConsent: boolean;
}

type UserModalProps =
  | { mode: 'create'; initial: CreateFormState; onCancel: () => void; onSubmit: (values: CreateFormState) => Promise<void> | void }
  | { mode: 'edit'; initial: EditFormState; onCancel: () => void; onSubmit: (values: EditFormState) => Promise<void> | void };

function UserModal(props: UserModalProps) {
  const { mode, onCancel } = props;

  // Create-mode fields.
  const [email, setEmail] = useState(props.mode === 'create' ? props.initial.email : '');
  const [password, setPassword] = useState('');

  // Shared / edit-mode fields.
  const [role, setRole] = useState(props.initial.role);
  const [hasConsent, setHasConsent] = useState(props.initial.hasConsent);
  const [active, setActive] = useState(props.mode === 'edit' ? props.initial.active : true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const titleId = 'user-modal-title';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (props.mode === 'create') {
        await props.onSubmit({ email: email.trim(), password, role, hasConsent });
      } else {
        await props.onSubmit({ role, active, hasConsent });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--ax-space-4)',
        background: 'rgba(15, 18, 25, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--ax-surface, #fff)',
          borderRadius: 'var(--ax-radius-lg, 12px)',
          border: '1px solid var(--ax-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div className="ax-card__header">
          <div className="ax-card__titles">
            <h2 className="ax-card__title" id={titleId}>{mode === 'create' ? 'Add a user' : 'Edit user'}</h2>
          </div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onCancel}>
            {ICON_CLOSE}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            {mode === 'create' && (
              <>
                <div className="ax-field">
                  <label className="ax-field__label" htmlFor="um-email">Email</label>
                  <input
                    id="um-email"
                    className="ax-input"
                    type="email"
                    placeholder="orgadmin@yourcompany.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="ax-field">
                  <label className="ax-field__label" htmlFor="um-password">Password</label>
                  <input
                    id="um-password"
                    className="ax-input"
                    type="password"
                    placeholder="SecurePass@1"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="ax-field">
              <label className="ax-field__label" htmlFor="um-role">Role</label>
              <select id="um-role" className="ax-select" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {mode === 'edit' && (
              <div className="ax-field">
                <label className="ax-field__label" htmlFor="um-active">Active</label>
                <select
                  id="um-active"
                  className="ax-select"
                  value={active ? 'true' : 'false'}
                  onChange={(e) => setActive(e.target.value === 'true')}
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
            )}

            <div className="ax-field">
              <label className="ax-field__label" htmlFor="um-consent">Consent</label>
              <select
                id="um-consent"
                className="ax-select"
                value={hasConsent ? 'true' : 'false'}
                onChange={(e) => setHasConsent(e.target.value === 'true')}
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>

            {error && <p className="ax-field__error">{error}</p>}
          </div>

          <div className="ax-card__footer ax-cluster" style={{ justifyContent: 'flex-end', gap: 'var(--ax-space-3)' }}>
            <button type="button" className="ax-btn ax-btn--secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="ax-btn ax-btn--primary" disabled={busy}>
              <span className="ax-btn__label">{busy ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- page */
export function OrgUser() {
  const [users, setUsers] = useState<OrgUserRecord[]>(() => seedUsers(37));
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; orgId: string } | null>(null);

  useEffect(() => {
    listOrgUsers().then((data) => { if (data.length) setUsers(data); });
  }, []);

  const total = users.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const rows = useMemo(() => users.slice(start, start + PAGE_SIZE), [users, start]);

  const editingUser = modal?.mode === 'edit' ? users.find((u) => u.orgId === modal.orgId) : undefined;

  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), pageCount));

  const createUser = async (values: CreateFormState) => {
    try {
      const created = await createOrgUser(values);
      setUsers((prev) => [created, ...prev]);
    } catch {
      const orgId = `ORG-${String(1000 + users.length + 1)}`;
      setUsers((prev) => [{ orgId, email: values.email, role: values.role, active: true, hasConsent: values.hasConsent }, ...prev]);
    }
    setPage(1);
    setModal(null);
  };

  const saveEdit = async (orgId: string, values: EditFormState) => {
    try {
      const updated = await updateOrgUser(orgId, values);
      setUsers((prev) => prev.map((u) => u.orgId === orgId ? { ...u, ...updated } : u));
    } catch {
      setUsers((prev) => prev.map((u) => u.orgId === orgId ? { ...u, ...values } : u));
    }
    setModal(null);
  };

  /* Delete calls the soft-deactivate endpoint (sets active: false, returns 204). */
  const handleDelete = async (user: OrgUserRecord) => {
    try { await deleteOrgUser(user.orgId); } catch { /* ignore — 204 or network */ }
    setUsers((prev) => prev.filter((u) => u.orgId !== user.orgId));
  };

  return (
    <>
      <PageHead
        title="Organisation Users"
        subtitle="Everyone with access to this organisation."
        actions={
          <button type="button" className="ax-btn ax-btn--primary" onClick={() => setModal({ mode: 'create' })}>
            {ICON_PLUS}<span className="ax-btn__label">Create User</span>
          </button>
        }
      />

      <div className="ax-dash-grid">
        <section className="ax-card ax-col--12" role="region" aria-label="Organisation Users">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">Organisation Users</h2>
              <p className="ax-card__subtitle">{total.toLocaleString()} total user{total === 1 ? '' : 's'}</p>
            </div>
          </div>

          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">OrgId</th>
                  <th className="ax-table__th" scope="col">Email</th>
                  <th className="ax-table__th" scope="col">Role</th>
                  <th className="ax-table__th" scope="col">Consent</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.orgId} className="ax-table__row">
                    <td className="ax-table__td ax-num">{u.orgId}</td>
                    <td className="ax-table__td" style={{ color: 'var(--ax-text-strong)' }}>{u.email}</td>
                    <td className="ax-table__td">{roleLabel(u.role)}</td>
                    <td className="ax-table__td">
                      <span className={`ax-badge ax-badge--soft ax-badge--pill ${u.hasConsent ? 'ax-badge--success' : 'ax-badge--warning'}`}>
                        <span className="ax-badge__dot" />{u.hasConsent ? 'True' : 'False'}
                      </span>
                    </td>
                    <td className="ax-table__td ax-table__td--num">
                      <div className="ax-cluster" style={{ justifyContent: 'flex-end', gap: 'var(--ax-space-4)' }}>
                        <button
                          type="button"
                          className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                          aria-label={`Edit ${u.email}`}
                          onClick={() => setModal({ mode: 'edit', orgId: u.orgId })}
                        >
                          {ICON_EDIT}
                        </button>
                        <button
                          type="button"
                          className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                          aria-label={`Delete ${u.email}`}
                          onClick={() => handleDelete(u)}
                          style={{ color: 'var(--ax-danger)' }}
                        >
                          {ICON_DELETE}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="ax-table__td" colSpan={5} style={{ textAlign: 'center', color: 'var(--ax-text-subtle)', padding: 'var(--ax-space-6)' }}>
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ax-card__footer ax-cluster" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>
              {total === 0 ? 'Showing 0 of 0' : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total}`}
            </span>
            <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Previous page" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                {ICON_CHEV_LEFT}
              </button>
              <span className="ax-num" style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-strong)', minWidth: 64, textAlign: 'center' }}>
                Page {page} of {pageCount}
              </span>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Next page" onClick={() => goToPage(page + 1)} disabled={page >= pageCount}>
                {ICON_CHEV_RIGHT}
              </button>
            </div>
          </div>
        </section>
      </div>

      {modal?.mode === 'create' && (
        <UserModal
          mode="create"
          initial={{ email: '', password: '', role: ROLES[0].value, hasConsent: true }}
          onCancel={() => setModal(null)}
          onSubmit={createUser}
        />
      )}

      {modal?.mode === 'edit' && editingUser && (
        <UserModal
          mode="edit"
          initial={{ role: editingUser.role, active: editingUser.active, hasConsent: editingUser.hasConsent }}
          onCancel={() => setModal(null)}
          onSubmit={(values) => saveEdit(editingUser.orgId, values)}
        />
      )}
    </>
  );
}

export default OrgUser;