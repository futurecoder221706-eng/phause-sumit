/*
 * Phause — RBAC (Role-Based Access Control).
 *
 * Admin-only page. Two sections:
 *   1. Roles list — all roles with their permissions.
 *      "Create Role" opens a modal with name, description, permission checkboxes.
 *   2. Assign Role — pick an org user + role → POST /roles/assign.
 */
import { useEffect, useState } from 'react';
import { PageHead } from '../../components/shell/PageHead';
import {
  listRoles,
  createRole,
  assignRole,
  PERMISSION_GROUPS,
  type Role,
  type RoleFormValues,
} from '../../api/roles/roles.api';

// ── icons ─────────────────────────────────────────────────────────────────────
const IC_PLUS  = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>;
const IC_CLOSE = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>;
const IC_CHECK = <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>;
const IC_USER  = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

// ── Permission tag ─────────────────────────────────────────────────────────────
function PermTag({ perm }: { perm: string }) {
  const color = perm.startsWith('campaigns') ? 'var(--ax-accent)'
    : perm.startsWith('employees')   ? 'var(--ax-viz-cyan)'
    : perm.startsWith('reports')     ? 'var(--ax-viz-violet)'
    : perm.startsWith('risk')        ? 'var(--ax-danger-500)'
    : perm.startsWith('training')    ? 'var(--ax-viz-emerald)'
    : perm.startsWith('billing')     ? 'var(--ax-viz-amber)'
    : perm.startsWith('roles')       ? 'var(--ax-viz-pink)'
    : 'var(--ax-text-muted)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 99, margin: '2px',
      background: `color-mix(in oklch,${color} 14%,transparent)`,
      color, fontSize: 'var(--ax-text-2xs)', fontWeight: 600,
      fontFamily: 'var(--ax-font-mono)',
    }}>
      {perm}
    </span>
  );
}

// ── Create Role modal ──────────────────────────────────────────────────────────
function CreateRoleModal({ onClose, onSave }: { onClose: () => void; onSave: (r: Role) => void }) {
  const [name, setName]           = useState('');
  const [desc, setDesc]           = useState('');
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');

  function toggle(perm: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(perm) ? next.delete(perm) : next.add(perm);
      return next;
    });
  }
  function toggleGroup(perms: string[]) {
    const allOn = perms.every((p) => selected.has(p));
    setSelected((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => allOn ? next.delete(p) : next.add(p));
      return next;
    });
  }
  function selectAll() { setSelected(new Set(PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key)))); }
  function clearAll()  { setSelected(new Set()); }

  const filteredGroups = search.trim()
    ? PERMISSION_GROUPS.map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) => p.key.includes(search.toLowerCase()) || p.label.toLowerCase().includes(search.toLowerCase()),
        ),
      })).filter((g) => g.permissions.length > 0)
    : PERMISSION_GROUPS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const values: RoleFormValues = {
        name: name.trim(),
        description: desc.trim(),
        permissions: Array.from(selected),
      };
      onSave(await createRole(values));
    } finally { setSaving(false); }
  }

  return (
    <div
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'var(--ax-space-4)', background:'rgba(15,18,25,.55)', backdropFilter:'blur(4px)' }}
    >
      <div className="ax-card" role="dialog" aria-modal="true" aria-labelledby="cr-modal-title"
        style={{ width:'100%', maxWidth:620, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {/* header */}
        <div className="ax-card__header" style={{ flexShrink:0 }}>
          <div className="ax-card__titles"><h2 className="ax-card__title" id="cr-modal-title">Create Role</h2><p className="ax-card__subtitle">Define the role name and select its permissions.</p></div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onClose}>{IC_CLOSE}</button>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
          <div className="ax-card__body" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'var(--ax-space-4)' }}>

            {/* name + description */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--ax-space-3)' }}>
              <div className="ax-field">
                <label className="ax-label" htmlFor="cr-name">Role name <span style={{color:'var(--ax-danger-500)'}}>*</span></label>
                <input id="cr-name" className="ax-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Campaign Manager" required />
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor="cr-desc">Description</label>
                <input id="cr-desc" className="ax-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Brief description…" />
              </div>
            </div>

            {/* permissions header */}
            <div>
              <div className="ax-cluster" style={{ justifyContent:'space-between', marginBottom:'var(--ax-space-2)' }}>
                <span style={{ fontWeight:600, fontSize:'var(--ax-text-sm)', color:'var(--ax-text-strong)' }}>
                  Permissions
                  {selected.size > 0 && (
                    <span style={{ marginLeft:6, padding:'1px 7px', borderRadius:99, background:'var(--ax-accent)', color:'var(--ax-on-accent)', fontSize:'var(--ax-text-2xs)', fontWeight:700, verticalAlign:'middle' }}>
                      {selected.size}
                    </span>
                  )}
                </span>
                <div className="ax-cluster" style={{ gap:'var(--ax-space-2)' }}>
                  <button type="button" className="ax-btn ax-btn--ghost ax-btn--xs" onClick={selectAll}>Select all</button>
                  <button type="button" className="ax-btn ax-btn--ghost ax-btn--xs" onClick={clearAll}>Clear</button>
                </div>
              </div>
              <input
                className="ax-input ax-input--sm"
                placeholder="Search permissions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom:'var(--ax-space-3)' }}
              />

              {/* permission groups */}
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--ax-space-4)' }}>
                {filteredGroups.map((g) => {
                  const keys = g.permissions.map((p) => p.key);
                  const allOn = keys.every((k) => selected.has(k));
                  const someOn = keys.some((k) => selected.has(k));
                  return (
                    <div key={g.group}>
                      {/* group header with "select group" checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(keys)}
                        style={{ display:'flex', alignItems:'center', gap:'var(--ax-space-2)', background:'none', border:'none', cursor:'pointer', padding:'0 0 var(--ax-space-2)', width:'100%', textAlign:'left' }}
                      >
                        <span style={{
                          width:16, height:16, borderRadius:4, flexShrink:0,
                          border: `2px solid ${allOn || someOn ? 'var(--ax-accent)' : 'var(--ax-border-strong)'}`,
                          background: allOn ? 'var(--ax-accent)' : someOn ? 'color-mix(in oklch,var(--ax-accent) 30%,transparent)' : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center', color:'white',
                        }}>
                          {allOn && IC_CHECK}
                          {someOn && !allOn && <span style={{width:6,height:2,background:'var(--ax-accent)',borderRadius:1,display:'block'}}/>}
                        </span>
                        <span style={{ fontSize:'var(--ax-text-xs)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--ax-text-muted)' }}>
                          {g.group}
                        </span>
                      </button>

                      {/* individual permissions */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--ax-space-1)' }}>
                        {g.permissions.map((p) => (
                          <label
                            key={p.key}
                            style={{ display:'flex', alignItems:'center', gap:'var(--ax-space-2)', cursor:'pointer', padding:'var(--ax-space-2) var(--ax-space-2)', borderRadius:'var(--ax-radius-md)', background: selected.has(p.key) ? 'color-mix(in oklch,var(--ax-accent) 8%,transparent)' : 'transparent', border: `1px solid ${selected.has(p.key) ? 'color-mix(in oklch,var(--ax-accent) 30%,transparent)' : 'transparent'}` }}
                          >
                            <span style={{
                              width:16, height:16, borderRadius:4, flexShrink:0,
                              border: `2px solid ${selected.has(p.key) ? 'var(--ax-accent)' : 'var(--ax-border-strong)'}`,
                              background: selected.has(p.key) ? 'var(--ax-accent)' : 'transparent',
                              display:'flex', alignItems:'center', justifyContent:'center', color:'white',
                            }}>
                              {selected.has(p.key) && IC_CHECK}
                            </span>
                            <input type="checkbox" className="ax-visually" checked={selected.has(p.key)} onChange={() => toggle(p.key)} />
                            <span style={{ fontSize:'var(--ax-text-xs)', color: selected.has(p.key) ? 'var(--ax-text-strong)' : 'var(--ax-text)' }}>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="ax-card__footer ax-cluster" style={{ justifyContent:'space-between', flexShrink:0 }}>
            <span style={{ fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)' }}>
              {selected.size} permission{selected.size !== 1 ? 's' : ''} selected
            </span>
            <div className="ax-cluster" style={{ gap:'var(--ax-space-3)' }}>
              <button type="button" className="ax-btn ax-btn--secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className={`ax-btn ax-btn--primary${saving ? ' is-loading':''}`} aria-busy={saving}>
                <span className="ax-btn__spinner" aria-hidden="true"/>
                <span className="ax-btn__label">Create role</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assign Role modal ──────────────────────────────────────────────────────────
function AssignRoleModal({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const [userId, setUserId]   = useState('');
  const [roleId, setRoleId]   = useState(roles[0]?.id ?? '');
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr]         = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim() || !roleId) return;
    setSaving(true); setErr('');
    try {
      await assignRole({ userId: userId.trim(), roleId });
      setSuccess(true);
    } catch {
      setErr('Failed to assign role. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <div
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'var(--ax-space-4)', background:'rgba(15,18,25,.55)', backdropFilter:'blur(4px)' }}
    >
      <div className="ax-card" role="dialog" aria-modal="true" aria-labelledby="ar-modal-title" style={{ width:'100%', maxWidth:420 }}>
        <div className="ax-card__header">
          <div className="ax-card__titles"><h2 className="ax-card__title" id="ar-modal-title">Assign Role to Org User</h2></div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onClose}>{IC_CLOSE}</button>
        </div>
        {success ? (
          <div className="ax-card__body" style={{ textAlign:'center', padding:'var(--ax-space-8)' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'color-mix(in oklch,var(--ax-viz-emerald) 15%,transparent)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto var(--ax-space-4)' }}>
              <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="var(--ax-viz-emerald)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
            </div>
            <p style={{ margin:0, fontWeight:600, color:'var(--ax-text-strong)' }}>Role assigned successfully!</p>
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" style={{ marginTop:'var(--ax-space-4)' }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="ax-card__body" style={{ display:'flex', flexDirection:'column', gap:'var(--ax-space-4)' }}>
              {err && (
                <div role="alert" className="ax-alert ax-alert--danger" style={{ padding:'var(--ax-space-3) var(--ax-space-4)' }}>
                  <div className="ax-alert__content"><p className="ax-alert__message" style={{ color:'var(--ax-danger-500)' }}>{err}</p></div>
                </div>
              )}
              <div className="ax-field">
                <label className="ax-label" htmlFor="ar-user">Org User ID</label>
                <input id="ar-user" className="ax-input" placeholder="e.g. user-123 or email" value={userId} onChange={(e) => setUserId(e.target.value)} required />
                <p className="ax-field__message">Enter the user's ID or email address.</p>
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor="ar-role">Role</label>
                <select id="ar-role" className="ax-select" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              {/* show selected role's permissions preview */}
              {roleId && (() => {
                const role = roles.find((r) => r.id === roleId);
                return role && role.permissions.length > 0 ? (
                  <div style={{ padding:'var(--ax-space-3)', borderRadius:'var(--ax-radius-md)', background:'var(--ax-surface-subtle)' }}>
                    <p style={{ margin:'0 0 var(--ax-space-2)', fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
                      Permissions this user will receive
                    </p>
                    <div style={{ display:'flex', flexWrap:'wrap' }}>
                      {role.permissions.map((p) => <PermTag key={p} perm={p} />)}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="ax-card__footer ax-cluster" style={{ justifyContent:'flex-end', gap:'var(--ax-space-3)' }}>
              <button type="button" className="ax-btn ax-btn--secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className={`ax-btn ax-btn--primary${saving ? ' is-loading':''}`} aria-busy={saving}>
                <span className="ax-btn__spinner" aria-hidden="true"/>
                <span className="ax-btn__label">Assign role</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main RBAC page ─────────────────────────────────────────────────────────────
type Modal = 'create' | 'assign' | null;

export function RBAC() {
  const [roles, setRoles]     = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<Modal>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    listRoles().then((data) => { setRoles(data); setLoading(false); });
  }, []);

  function onRoleCreated(r: Role) {
    setRoles((prev) => [r, ...prev]);
    setModal(null);
  }

  return (
    <>
      {modal === 'create' && <CreateRoleModal onClose={() => setModal(null)} onSave={onRoleCreated} />}
      {modal === 'assign' && <AssignRoleModal roles={roles} onClose={() => setModal(null)} />}

      <PageHead
        title="Roles & Permissions"
        subtitle="Create roles, define permission sets, and assign them to org users."
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--secondary" onClick={() => setModal('assign')} disabled={roles.length === 0}>
              {IC_USER}<span className="ax-btn__label">Assign Role</span>
            </button>
            <button type="button" className="ax-btn ax-btn--primary" onClick={() => setModal('create')}>
              {IC_PLUS}<span className="ax-btn__label">Create Role</span>
            </button>
          </>
        }
      />

      {/* ── summary strip ─────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'var(--ax-space-4)', marginBottom:'var(--ax-space-6)' }}>
        {[
          { label:'Total Roles',   value: roles.length },
          { label:'Total Permissions', value: new Set(roles.flatMap((r) => r.permissions)).size },
        ].map(({ label, value }) => (
          <div key={label} className="ax-card ax-kpi" role="region" aria-label={label}>
            <div className="ax-card__body">
              <div className="ax-kpi__label">{label}</div>
              <div className="ax-kpi__value ax-num" style={{ fontSize:'var(--ax-text-3xl)', color:'var(--ax-accent)' }}>{loading ? '—' : value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Roles list ────────────────────────────────────────────────── */}
      <div className="ax-card">
        <div className="ax-card__header">
          <div className="ax-card__titles"><h2 className="ax-card__title">Roles</h2><p className="ax-card__subtitle">Click a role to expand its permissions.</p></div>
        </div>

        {loading ? (
          <div className="ax-card__body" style={{ display:'flex', flexDirection:'column', gap:'var(--ax-space-3)' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ax-skeleton" style={{ height:64, borderRadius:'var(--ax-radius-lg)' }} />
            ))}
          </div>
        ) : roles.length === 0 ? (
          <div className="ax-card__body" style={{ textAlign:'center', padding:'var(--ax-space-10)', color:'var(--ax-text-subtle)' }}>
            No roles yet — click <strong>Create Role</strong> to add one.
          </div>
        ) : (
          <div className="ax-card__body" style={{ paddingTop:0, display:'flex', flexDirection:'column', gap:'var(--ax-space-2)' }}>
            {roles.map((role) => {
              const open = expanded === role.id;
              return (
                <div
                  key={role.id}
                  style={{ border:'1px solid var(--ax-border)', borderRadius:'var(--ax-radius-lg)', overflow:'hidden', transition:'border-color .15s' }}
                >
                  {/* role header row */}
                  <button
                    type="button"
                    style={{ display:'flex', alignItems:'center', gap:'var(--ax-space-3)', width:'100%', padding:'var(--ax-space-4)', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}
                    onClick={() => setExpanded(open ? null : role.id)}
                    aria-expanded={open}
                  >
                    {/* chevron */}
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink:0, color:'var(--ax-text-subtle)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform .2s' }}>
                      <path d="M9 6l6 6-6 6"/>
                    </svg>

                    {/* avatar */}
                    <span style={{ width:36, height:36, borderRadius:'var(--ax-radius-md)', background:'color-mix(in oklch,var(--ax-accent) 14%,transparent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--ax-accent)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3"/></svg>
                    </span>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:'var(--ax-weight-semibold)', color:'var(--ax-text-strong)' }}>{role.name}</div>
                      {role.description && (
                        <div style={{ fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{role.description}</div>
                      )}
                    </div>

                    <span style={{ flexShrink:0, padding:'2px 8px', borderRadius:99, background:'color-mix(in oklch,var(--ax-accent) 12%,transparent)', color:'var(--ax-accent)', fontSize:'var(--ax-text-xs)', fontWeight:600 }}>
                      {role.permissions.length} perm{role.permissions.length !== 1 ? 's':''}
                    </span>
                  </button>

                  {/* expanded permissions */}
                  {open && (
                    <div style={{ padding:'0 var(--ax-space-4) var(--ax-space-4) calc(var(--ax-space-4) + 16px + var(--ax-space-3))', borderTop:'1px solid var(--ax-border)' }}>
                      <p style={{ margin:'var(--ax-space-3) 0 var(--ax-space-2)', fontSize:'var(--ax-text-xs)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--ax-text-subtle)' }}>
                        Permissions
                      </p>
                      <div style={{ display:'flex', flexWrap:'wrap' }}>
                        {role.permissions.length === 0
                          ? <span style={{ fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)' }}>No permissions assigned.</span>
                          : role.permissions.map((p) => <PermTag key={p} perm={p} />)
                        }
                      </div>
                      <div style={{ marginTop:'var(--ax-space-3)', display:'flex', gap:'var(--ax-space-2)' }}>
                        <button
                          type="button"
                          className="ax-btn ax-btn--secondary ax-btn--sm"
                          onClick={() => setModal('assign')}
                        >
                          {IC_USER}<span className="ax-btn__label">Assign to user</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Permission reference ───────────────────────────────────────── */}
      <div className="ax-card" style={{ marginTop:'var(--ax-space-6)' }}>
        <div className="ax-card__header">
          <div className="ax-card__titles"><h2 className="ax-card__title">Permission Reference</h2><p className="ax-card__subtitle">All available permissions grouped by resource.</p></div>
        </div>
        <div className="ax-card__body" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'var(--ax-space-5)' }}>
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.group}>
              <p style={{ margin:'0 0 var(--ax-space-2)', fontSize:'var(--ax-text-xs)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--ax-text-muted)' }}>{g.group}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {g.permissions.map((p) => (
                  <div key={p.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'var(--ax-text-xs)', color:'var(--ax-text)' }}>{p.label}</span>
                    <code style={{ fontSize:'var(--ax-text-2xs)', color:'var(--ax-text-subtle)', fontFamily:'var(--ax-font-mono)' }}>{p.key}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default RBAC;
