/*
 * Phause — Training & Remediation (Step 11).
 *
 * Three tabs:
 *   Modules      — create / list training modules (11.1, 11.2)
 *   Enrolments   — list who needs to do training (11.3)
 *   Completions  — record completion + view per-employee history (11.4, 11.5)
 */
import { useEffect, useState } from 'react';
import { PageHead } from '../../components/shell/PageHead';
import {
  createTrainingModule,
  listTrainingModules,
  listTrainingEnrolments,
  recordTrainingCompletion,
  listCompletionsForEmployee,
  type TrainingModule,
  type TrainingEnrolment,
  type TrainingCompletion,
  type TrainingModuleFormValues,
} from '../../api/training/training.api';

// ── icons ─────────────────────────────────────────────────────────────────────
const IC_PLUS   = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
const IC_CLOSE  = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
const IC_CHECK  = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>;
const IC_HIST   = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 8v4l3 3"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>;
const IC_REFRESH= <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-1.985 5.2"/><path d="M20 20v-5h-5"/></svg>;

// ── status badge ──────────────────────────────────────────────────────────────
const STATUS_COLOURS: Record<string, { bg: string; fg: string }> = {
  pending:     { bg: 'color-mix(in oklch,var(--ax-text-subtle) 15%,transparent)',  fg: 'var(--ax-text-muted)' },
  in_progress: { bg: 'color-mix(in oklch,var(--ax-viz-cyan) 15%,transparent)',     fg: 'var(--ax-viz-cyan)' },
  completed:   { bg: 'color-mix(in oklch,var(--ax-viz-emerald) 15%,transparent)',  fg: 'var(--ax-viz-emerald)' },
  overdue:     { bg: 'color-mix(in oklch,var(--ax-danger-500) 15%,transparent)',   fg: 'var(--ax-danger-500)' },
};
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOURS[status] ?? STATUS_COLOURS.pending;
  const label = status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, background:c.bg, color:c.fg, fontSize:'var(--ax-text-xs)', fontWeight:600 }}>
      <i style={{ width:6, height:6, borderRadius:'50%', background:c.fg, flexShrink:0 }} />{label}
    </span>
  );
}

// ── modal dialog base ─────────────────────────────────────────────────────────
function ModalWrap({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'var(--ax-space-4)', background:'rgba(15,18,25,.5)', backdropFilter:'blur(4px)' }}
    >
      {children}
    </div>
  );
}

// ── Create Module modal ───────────────────────────────────────────────────────
function CreateModuleModal({ onClose, onSave }: { onClose: () => void; onSave: (m: TrainingModule) => void }) {
  const EMPTY: TrainingModuleFormValues = { title:'', description:'', durationMinutes:30, category:'', mandatory:false };
  const [form, setForm] = useState<TrainingModuleFormValues>(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof TrainingModuleFormValues>(k: K, v: TrainingModuleFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { onSave(await createTrainingModule(form)); }
    finally { setSaving(false); }
  }

  return (
    <ModalWrap onClose={onClose}>
      <div className="ax-card" role="dialog" aria-modal="true" aria-labelledby="tm-modal-title"
        style={{ width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto' }}>
        <div className="ax-card__header">
          <div className="ax-card__titles"><h2 className="ax-card__title" id="tm-modal-title">Create Training Module</h2></div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onClose}>{IC_CLOSE}</button>
        </div>
        <form onSubmit={submit}>
          <div className="ax-card__body" style={{ display:'grid', gap:'var(--ax-space-4)' }}>
            <div className="ax-field">
              <label className="ax-label" htmlFor="tm-title">Title</label>
              <input id="tm-title" className="ax-input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="tm-desc">Description</label>
              <textarea id="tm-desc" className="ax-input" rows={3} value={form.description}
                onChange={(e) => set('description', e.target.value)} style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--ax-space-3)' }}>
              <div className="ax-field">
                <label className="ax-label" htmlFor="tm-dur">Duration (minutes)</label>
                <input id="tm-dur" className="ax-input" type="number" min={1} value={form.durationMinutes}
                  onChange={(e) => set('durationMinutes', Number(e.target.value))} required />
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor="tm-cat">Category</label>
                <input id="tm-cat" className="ax-input" value={form.category} placeholder="e.g. Phishing"
                  onChange={(e) => set('category', e.target.value)} required />
              </div>
            </div>
            <label className="ax-check" style={{ fontSize:'var(--ax-text-sm)', color:'var(--ax-text)' }}>
              <input type="checkbox" className="ax-checkbox" checked={form.mandatory}
                onChange={(e) => set('mandatory', e.target.checked)} />
              <span>Mandatory for all employees</span>
            </label>
          </div>
          <div className="ax-card__footer ax-cluster" style={{ justifyContent:'flex-end', gap:'var(--ax-space-3)' }}>
            <button type="button" className="ax-btn ax-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className={`ax-btn ax-btn--primary${saving ? ' is-loading' : ''}`} aria-busy={saving}>
              <span className="ax-btn__spinner" aria-hidden="true" />
              <span className="ax-btn__label">Save module</span>
            </button>
          </div>
        </form>
      </div>
    </ModalWrap>
  );
}

// ── Record Completion modal ───────────────────────────────────────────────────
function RecordCompletionModal({
  modules, onClose, onSave,
}: { modules: TrainingModule[]; onClose: () => void; onSave: (c: TrainingCompletion) => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? '');
  const [score, setScore] = useState('');
  const [passed, setPassed] = useState(true);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      onSave(await recordTrainingCompletion({
        employeeId,
        moduleId,
        score:  score ? Number(score) : undefined,
        passed,
      }));
    } finally { setSaving(false); }
  }

  return (
    <ModalWrap onClose={onClose}>
      <div className="ax-card" role="dialog" aria-modal="true" aria-labelledby="rc-modal-title"
        style={{ width:'100%', maxWidth:460, maxHeight:'90vh', overflowY:'auto' }}>
        <div className="ax-card__header">
          <div className="ax-card__titles"><h2 className="ax-card__title" id="rc-modal-title">Record Completion</h2></div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onClose}>{IC_CLOSE}</button>
        </div>
        <form onSubmit={submit}>
          <div className="ax-card__body" style={{ display:'grid', gap:'var(--ax-space-4)' }}>
            <div className="ax-field">
              <label className="ax-label" htmlFor="rc-emp">Employee ID</label>
              <input id="rc-emp" className="ax-input" placeholder="e.g. EMP-1001" value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)} required />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="rc-mod">Module</label>
              <select id="rc-mod" className="ax-select" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--ax-space-3)' }}>
              <div className="ax-field">
                <label className="ax-label" htmlFor="rc-score">Score (optional)</label>
                <input id="rc-score" className="ax-input" type="number" min={0} max={100} placeholder="0–100"
                  value={score} onChange={(e) => setScore(e.target.value)} />
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor="rc-passed">Result</label>
                <select id="rc-passed" className="ax-select" value={String(passed)} onChange={(e) => setPassed(e.target.value === 'true')}>
                  <option value="true">Passed</option>
                  <option value="false">Failed</option>
                </select>
              </div>
            </div>
          </div>
          <div className="ax-card__footer ax-cluster" style={{ justifyContent:'flex-end', gap:'var(--ax-space-3)' }}>
            <button type="button" className="ax-btn ax-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className={`ax-btn ax-btn--primary${saving ? ' is-loading' : ''}`} aria-busy={saving}>
              <span className="ax-btn__spinner" aria-hidden="true" />
              <span className="ax-btn__label">Record</span>
            </button>
          </div>
        </form>
      </div>
    </ModalWrap>
  );
}

// ── Employee Completions modal (11.5) ─────────────────────────────────────────
function EmployeeHistoryModal({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const [comps, setComps] = useState<TrainingCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCompletionsForEmployee(employeeId).then((data) => {
      setComps(data);
      setLoading(false);
    });
  }, [employeeId]);

  return (
    <ModalWrap onClose={onClose}>
      <div className="ax-card" role="dialog" aria-modal="true" aria-labelledby="eh-modal-title"
        style={{ width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' }}>
        <div className="ax-card__header">
          <div className="ax-card__titles">
            <h2 className="ax-card__title" id="eh-modal-title">Completion History</h2>
            <p className="ax-card__subtitle" style={{ fontFamily:'var(--ax-font-mono)', fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)' }}>{employeeId}</p>
          </div>
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onClose}>{IC_CLOSE}</button>
        </div>
        <div className="ax-card__body" style={{ paddingTop:0 }}>
          {loading ? (
            <div style={{ padding:'var(--ax-space-8)', textAlign:'center', color:'var(--ax-text-subtle)' }}>Loading…</div>
          ) : comps.length === 0 ? (
            <p style={{ color:'var(--ax-text-subtle)', fontSize:'var(--ax-text-sm)', margin:0 }}>No completions recorded for this employee.</p>
          ) : (
            <div className="ax-table-wrap">
              <table className="ax-table ax-table--hover">
                <thead className="ax-table__head">
                  <tr>
                    <th className="ax-table__th" scope="col">Module</th>
                    <th className="ax-table__th" scope="col">Completed</th>
                    <th className="ax-table__th ax-table__th--num" scope="col">Score</th>
                    <th className="ax-table__th" scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {comps.map((c) => (
                    <tr key={c.id} className="ax-table__row">
                      <td className="ax-table__td" style={{ fontWeight:'var(--ax-weight-medium)', color:'var(--ax-text-strong)' }}>{c.moduleTitle || c.moduleId}</td>
                      <td className="ax-table__td" style={{ color:'var(--ax-text-muted)', fontSize:'var(--ax-text-sm)' }}>
                        {new Date(c.completedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      <td className="ax-table__td ax-table__td--num" style={{ fontFamily:'var(--ax-font-mono)', color:'var(--ax-text-muted)' }}>
                        {c.score != null ? `${c.score}%` : '—'}
                      </td>
                      <td className="ax-table__td">
                        <span style={{ fontWeight:600, color: c.passed ? 'var(--ax-viz-emerald)' : 'var(--ax-danger-500)' }}>
                          {c.passed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModalWrap>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Tab = 'modules' | 'enrolments' | 'completions';
type Modal =
  | 'create-module'
  | 'record-completion'
  | { history: string }
  | null;

export function Training() {
  const [tab, setTab] = useState<Tab>('modules');
  const [modal, setModal] = useState<Modal>(null);

  // modules
  const [modules, setModules]         = useState<TrainingModule[]>([]);
  const [modLoading, setModLoading]   = useState(true);

  // enrolments
  const [enrolments, setEnrolments]       = useState<TrainingEnrolment[]>([]);
  const [enrolLoading, setEnrolLoading]   = useState(true);

  // completions (for the Completions tab search)
  const [searchEmpId, setSearchEmpId]   = useState('');
  const [completions, setCompletions]   = useState<TrainingCompletion[]>([]);
  const [compLoading, setCompLoading]   = useState(false);
  const [compSearched, setCompSearched] = useState(false);

  // load on mount
  useEffect(() => {
    listTrainingModules().then((data) => { setModules(data); setModLoading(false); });
    listTrainingEnrolments().then((data) => { setEnrolments(data); setEnrolLoading(false); });
  }, []);

  function onModuleSaved(m: TrainingModule) {
    setModules((prev) => [m, ...prev]);
    setModal(null);
  }

  function onCompletionRecorded(c: TrainingCompletion) {
    setCompletions((prev) => [c, ...prev]);
    setModal(null);
    setCompSearched(true);
  }

  async function searchCompletions(e: React.FormEvent) {
    e.preventDefault();
    if (!searchEmpId.trim()) return;
    setCompLoading(true);
    setCompSearched(true);
    try {
      setCompletions(await listCompletionsForEmployee(searchEmpId.trim()));
    } finally { setCompLoading(false); }
  }

  // summary counts
  const pendingCount  = enrolments.filter((e) => e.status === 'pending' || e.status === 'in_progress').length;
  const overdueCount  = enrolments.filter((e) => e.status === 'overdue').length;
  const doneCount     = enrolments.filter((e) => e.status === 'completed').length;

  return (
    <>
      {modal === 'create-module' && (
        <CreateModuleModal onClose={() => setModal(null)} onSave={onModuleSaved} />
      )}
      {modal === 'record-completion' && (
        <RecordCompletionModal modules={modules} onClose={() => setModal(null)} onSave={onCompletionRecorded} />
      )}
      {modal !== null && typeof modal === 'object' && 'history' in modal && (
        <EmployeeHistoryModal employeeId={modal.history} onClose={() => setModal(null)} />
      )}

      <PageHead
        title="Training & Remediation"
        subtitle="Manage security awareness modules, track enrolments and record completions."
        actions={
          <>
            {tab === 'modules' && (
              <button type="button" className="ax-btn ax-btn--primary" onClick={() => setModal('create-module')}>
                {IC_PLUS}<span className="ax-btn__label">New Module</span>
              </button>
            )}
            {tab === 'completions' && (
              <button type="button" className="ax-btn ax-btn--primary" onClick={() => setModal('record-completion')}>
                {IC_CHECK}<span className="ax-btn__label">Record Completion</span>
              </button>
            )}
          </>
        }
      />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'var(--ax-space-4)', marginBottom:'var(--ax-space-6)' }}>
        {[
          { label:'Total Modules',   value: modules.length,   color:'var(--ax-accent)' },
          { label:'Pending / Active', value: pendingCount,    color:'var(--ax-viz-cyan)' },
          { label:'Overdue',          value: overdueCount,    color:'var(--ax-danger-500)' },
          { label:'Completed',        value: doneCount,       color:'var(--ax-viz-emerald)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="ax-card ax-kpi" role="region" aria-label={label}>
            <div className="ax-card__body">
              <div className="ax-kpi__label" style={{ marginBottom:'var(--ax-space-1)' }}>{label}</div>
              <div className="ax-kpi__value ax-num" style={{ fontSize:'var(--ax-text-3xl)', color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      <div className="ax-card">
        <div className="ax-card__header" style={{ borderBottom:'1px solid var(--ax-border)', paddingBottom:0 }}>
          <div role="tablist" className="ax-cluster" style={{ gap:0, borderBottom:'none' }}>
            {(['modules','enrolments','completions'] as Tab[]).map((t) => (
              <button
                key={t} type="button" role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                style={{
                  padding:'var(--ax-space-3) var(--ax-space-5)',
                  background:'none', border:'none', cursor:'pointer',
                  fontSize:'var(--ax-text-sm)', fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? 'var(--ax-accent)' : 'var(--ax-text-muted)',
                  borderBottom: tab === t ? '2px solid var(--ax-accent)' : '2px solid transparent',
                  textTransform:'capitalize',
                }}
              >
                {t === 'enrolments' ? 'Enrolments' : t === 'completions' ? 'Completions' : 'Modules'}
              </button>
            ))}
          </div>
        </div>

        {/* ── MODULES TAB ───────────────────────────────────────────── */}
        {tab === 'modules' && (
          <div className="ax-table-wrap" role="tabpanel">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Title</th>
                  <th className="ax-table__th" scope="col">Category</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">Duration</th>
                  <th className="ax-table__th" scope="col">Mandatory</th>
                  <th className="ax-table__th" scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                {modLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="ax-table__row">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="ax-table__td">
                          <span className="ax-skeleton" style={{ display:'inline-block', width: j===0?160:80, height:14, borderRadius:4 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : modules.length === 0 ? (
                  <tr className="ax-table__row">
                    <td className="ax-table__td" colSpan={5} style={{ textAlign:'center', color:'var(--ax-text-subtle)', padding:'var(--ax-space-10)' }}>
                      No modules yet — click <strong>New Module</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  modules.map((m) => (
                    <tr key={m.id} className="ax-table__row">
                      <td className="ax-table__td">
                        <div style={{ fontWeight:'var(--ax-weight-medium)', color:'var(--ax-text-strong)' }}>{m.title}</div>
                        {m.description && (
                          <div style={{ fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)', marginTop:2, maxWidth:320, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {m.description}
                          </div>
                        )}
                      </td>
                      <td className="ax-table__td">
                        <span className="ax-badge ax-badge--soft ax-badge--pill ax-badge--info">{m.category || '—'}</span>
                      </td>
                      <td className="ax-table__td ax-table__td--num" style={{ fontFamily:'var(--ax-font-mono)', color:'var(--ax-text-muted)' }}>
                        {m.durationMinutes} min
                      </td>
                      <td className="ax-table__td">
                        {m.mandatory
                          ? <span className="ax-badge ax-badge--soft ax-badge--pill ax-badge--danger">Required</span>
                          : <span className="ax-badge ax-badge--soft ax-badge--pill">Optional</span>}
                      </td>
                      <td className="ax-table__td" style={{ color:'var(--ax-text-muted)', fontSize:'var(--ax-text-sm)' }}>
                        {new Date(m.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ENROLMENTS TAB ────────────────────────────────────────── */}
        {tab === 'enrolments' && (
          <div role="tabpanel">
            <div className="ax-table-wrap">
              <table className="ax-table ax-table--hover">
                <thead className="ax-table__head">
                  <tr>
                    <th className="ax-table__th" scope="col">Employee</th>
                    <th className="ax-table__th" scope="col">Module</th>
                    <th className="ax-table__th" scope="col">Status</th>
                    <th className="ax-table__th" scope="col">Enrolled</th>
                    <th className="ax-table__th" scope="col">Due</th>
                    <th className="ax-table__th" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="ax-table__row">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="ax-table__td">
                            <span className="ax-skeleton" style={{ display:'inline-block', width: j===0?140:80, height:14, borderRadius:4 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : enrolments.length === 0 ? (
                    <tr className="ax-table__row">
                      <td className="ax-table__td" colSpan={6} style={{ textAlign:'center', color:'var(--ax-text-subtle)', padding:'var(--ax-space-10)' }}>
                        No enrolments found.
                      </td>
                    </tr>
                  ) : (
                    enrolments.map((en) => (
                      <tr key={en.id} className="ax-table__row">
                        <td className="ax-table__td">
                          <div style={{ fontWeight:'var(--ax-weight-medium)', color:'var(--ax-text-strong)' }}>{en.employeeName || en.employeeId}</div>
                          <div style={{ fontSize:'var(--ax-text-xs)', color:'var(--ax-text-subtle)' }}>{en.employeeEmail}</div>
                        </td>
                        <td className="ax-table__td" style={{ color:'var(--ax-text)', fontSize:'var(--ax-text-sm)' }}>{en.moduleTitle || en.moduleId}</td>
                        <td className="ax-table__td"><StatusBadge status={en.status} /></td>
                        <td className="ax-table__td" style={{ color:'var(--ax-text-muted)', fontSize:'var(--ax-text-sm)' }}>
                          {new Date(en.enrolledAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}
                        </td>
                        <td className="ax-table__td" style={{ color:'var(--ax-text-muted)', fontSize:'var(--ax-text-sm)' }}>
                          {en.dueAt ? new Date(en.dueAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : '—'}
                        </td>
                        <td className="ax-table__td">
                          <button
                            type="button"
                            className="ax-btn ax-btn--ghost ax-btn--sm"
                            aria-label={`View history for ${en.employeeName || en.employeeId}`}
                            onClick={() => setModal({ history: en.employeeId })}
                          >
                            {IC_HIST}<span className="ax-btn__label">History</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── COMPLETIONS TAB ───────────────────────────────────────── */}
        {tab === 'completions' && (
          <div role="tabpanel">
            {/* search bar */}
            <div className="ax-card__body" style={{ borderBottom:'1px solid var(--ax-border)' }}>
              <form onSubmit={searchCompletions} style={{ display:'flex', gap:'var(--ax-space-3)', alignItems:'flex-end', flexWrap:'wrap' }}>
                <div className="ax-field" style={{ flex:'1 1 240px', marginBottom:0 }}>
                  <label className="ax-label" htmlFor="comp-empid">Employee ID</label>
                  <input id="comp-empid" className="ax-input" placeholder="e.g. EMP-1001"
                    value={searchEmpId} onChange={(e) => setSearchEmpId(e.target.value)} />
                </div>
                <button type="submit" className={`ax-btn ax-btn--primary${compLoading ? ' is-loading':''}`} aria-busy={compLoading}>
                  <span className="ax-btn__spinner" aria-hidden="true" />
                  {IC_REFRESH}<span className="ax-btn__label">Fetch</span>
                </button>
              </form>
            </div>
            <div className="ax-table-wrap">
              <table className="ax-table ax-table--hover">
                <thead className="ax-table__head">
                  <tr>
                    <th className="ax-table__th" scope="col">Module</th>
                    <th className="ax-table__th" scope="col">Employee ID</th>
                    <th className="ax-table__th" scope="col">Completed</th>
                    <th className="ax-table__th ax-table__th--num" scope="col">Score</th>
                    <th className="ax-table__th" scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {compLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="ax-table__row">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="ax-table__td">
                            <span className="ax-skeleton" style={{ display:'inline-block', width:j===0?160:80, height:14, borderRadius:4 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : !compSearched ? (
                    <tr className="ax-table__row">
                      <td className="ax-table__td" colSpan={5} style={{ textAlign:'center', color:'var(--ax-text-subtle)', padding:'var(--ax-space-10)' }}>
                        Enter an employee ID above to load completions, or click <strong>Record Completion</strong> to add one.
                      </td>
                    </tr>
                  ) : completions.length === 0 ? (
                    <tr className="ax-table__row">
                      <td className="ax-table__td" colSpan={5} style={{ textAlign:'center', color:'var(--ax-text-subtle)', padding:'var(--ax-space-10)' }}>
                        No completions found for <code>{searchEmpId}</code>.
                      </td>
                    </tr>
                  ) : (
                    completions.map((c) => (
                      <tr key={c.id} className="ax-table__row">
                        <td className="ax-table__td" style={{ fontWeight:'var(--ax-weight-medium)', color:'var(--ax-text-strong)' }}>{c.moduleTitle || c.moduleId}</td>
                        <td className="ax-table__td" style={{ fontFamily:'var(--ax-font-mono)', fontSize:'var(--ax-text-sm)', color:'var(--ax-text-subtle)' }}>{c.employeeId}</td>
                        <td className="ax-table__td" style={{ color:'var(--ax-text-muted)', fontSize:'var(--ax-text-sm)' }}>
                          {new Date(c.completedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                        </td>
                        <td className="ax-table__td ax-table__td--num" style={{ fontFamily:'var(--ax-font-mono)', color:'var(--ax-text-muted)' }}>
                          {c.score != null ? `${c.score}%` : '—'}
                        </td>
                        <td className="ax-table__td">
                          <span style={{ fontWeight:600, color: c.passed ? 'var(--ax-viz-emerald)' : 'var(--ax-danger-500)' }}>
                            {c.passed ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Training;
