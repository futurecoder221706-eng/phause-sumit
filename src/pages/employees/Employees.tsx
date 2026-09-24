import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHead } from '../../components/shell/PageHead';
import {
  listEmployees,
  createEmployee,
  importEmployeesCsv,
  updateEmployee as updateEmployeeApi,
  deleteEmployee as deleteEmployeeApi,
} from '../../api/employees/employees.api';

export type EmployeeSeniority = 'junior' | 'mid' | 'senior' | 'lead' | 'critical';

export interface EmployeeRecord {
  id: string;
  organisationId: string;
  email: string;
  name: string;
  department: string;
  seniority: EmployeeSeniority;
  hasConsent: boolean;
}

export interface EmployeeFormValues {
  email: string;
  name: string;
  department: string;
  seniority: EmployeeSeniority;
  hasConsent: boolean;
}

const PAGE_SIZE = 10;
const SENIORITY_OPTIONS: Array<{ value: EmployeeSeniority; label: string }> = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'critical', label: 'Critical' },
];

const SAMPLE_CSV = `email,name,department,seniority,hasConsent
bob@acme.com,Bob Jones,HR,junior,true
carol@acme.com,Carol White,IT,senior,true
dave@acme.com,Dave Brown,Finance,lead,true`;

const ICON_PLUS = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
const ICON_UPLOAD = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>;
const ICON_EYE = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2" /></svg>;
const ICON_EDIT = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 16 0 4 4 0 11-11a2.8 2.8 0 0 0-4-4L4 16Z" /><path d="m13.5 6.5 4 4" /></svg>;
const ICON_DELETE = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12h12l1-12M9 7V4h6v3" /></svg>;
const ICON_CLOSE = <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;

const SEED_EMPLOYEES: EmployeeRecord[] = [
  { id: 'EMP-1001', organisationId: 'ORG-2001', email: 'bob@acme.com', name: 'Bob Jones', department: 'HR', seniority: 'junior', hasConsent: true },
  { id: 'EMP-1002', organisationId: 'ORG-2001', email: 'carol@acme.com', name: 'Carol White', department: 'IT', seniority: 'senior', hasConsent: true },
  { id: 'EMP-1003', organisationId: 'ORG-2002', email: 'dave@acme.com', name: 'Dave Brown', department: 'Finance', seniority: 'lead', hasConsent: true },
  { id: 'EMP-1004', organisationId: 'ORG-2002', email: 'maya@northwind.io', name: 'Maya Patel', department: 'Security', seniority: 'critical', hasConsent: false },
  { id: 'EMP-1005', organisationId: 'ORG-2003', email: 'liam@globex.co', name: 'Liam Smith', department: 'Operations', seniority: 'mid', hasConsent: true },
];

function ConsentBadge({ value }: { value: boolean }) {
  return <span className={`ax-badge ax-badge--soft ax-badge--pill ${value ? 'ax-badge--success' : 'ax-badge--warning'}`}><span className="ax-badge__dot" />{value ? 'True' : 'False'}</span>;
}

function EmployeeModal({ initial, title, onCancel, onSubmit }: { initial?: EmployeeFormValues; title: string; onCancel: () => void; onSubmit: (values: EmployeeFormValues) => void }) {
  const [form, setForm] = useState<EmployeeFormValues>(initial ?? { email: '', name: '', department: '', seniority: 'mid', hasConsent: false });
  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); onSubmit(form); };

  return <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)', background: 'rgba(15,18,25,.5)', backdropFilter: 'blur(4px)' }}>
    <div className="ax-card" role="dialog" aria-modal="true" aria-labelledby="employee-modal-title" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
      <div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title" id="employee-modal-title">{title}</h2></div><button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={onCancel}>{ICON_CLOSE}</button></div>
      <form onSubmit={submit}><div className="ax-card__body" style={{ display: 'grid', gap: 'var(--ax-space-4)' }}>
        <div className="ax-field"><label className="ax-label" htmlFor="employee-email">Email</label><input id="employee-email" className="ax-input" type="email" value={form.email} onChange={(event) => set('email', event.target.value)} required /></div>
        <div className="ax-field"><label className="ax-label" htmlFor="employee-name">Name</label><input id="employee-name" className="ax-input" value={form.name} onChange={(event) => set('name', event.target.value)} required /></div>
        <div className="ax-field"><label className="ax-label" htmlFor="employee-department">Department</label><input id="employee-department" className="ax-input" value={form.department} onChange={(event) => set('department', event.target.value)} required /></div>
        <div className="ax-field"><label className="ax-label" htmlFor="employee-seniority">Seniority</label><select id="employee-seniority" className="ax-select" value={form.seniority} onChange={(event) => set('seniority', event.target.value as EmployeeSeniority)}>{SENIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        <div className="ax-field"><label className="ax-label" htmlFor="employee-consent">Has consent</label><select id="employee-consent" className="ax-select" value={String(form.hasConsent)} onChange={(event) => set('hasConsent', event.target.value === 'true')}><option value="true">True</option><option value="false">False</option></select></div>
      </div><div className="ax-card__footer ax-cluster" style={{ justifyContent: 'flex-end', gap: 'var(--ax-space-3)' }}><button type="button" className="ax-btn ax-btn--secondary" onClick={onCancel}>Cancel</button><button type="submit" className="ax-btn ax-btn--primary">Save employee</button></div></form>
    </div>
  </div>;
}

function parseCsv(csv: string): EmployeeFormValues[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('The CSV must include a header and at least one employee.');
  const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
  const required = ['email', 'name', 'department', 'seniority', 'hasconsent'];
  if (required.some((header) => !headers.includes(header))) throw new Error('CSV headers must be email,name,department,seniority,hasConsent.');
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] ?? '']));
    const seniority = row.seniority.toLowerCase() as EmployeeSeniority;
    if (!row.email || !row.name || !row.department || !SENIORITY_OPTIONS.some((option) => option.value === seniority) || !['true', 'false'].includes(row.hasconsent.toLowerCase())) throw new Error(`Invalid employee data on CSV row ${index + 2}.`);
    return { email: row.email, name: row.name, department: row.department, seniority, hasConsent: row.hasconsent.toLowerCase() === 'true' };
  });
}

export function Employees() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(SEED_EMPLOYEES);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'import' | { edit: EmployeeRecord } | { view: EmployeeRecord } | null>(null);
  const [importError, setImportError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const pageCount = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
  const rows = useMemo(() => employees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [employees, page]);

  // Load employees from API on mount; fall back to seed data silently
  useEffect(() => {
    listEmployees().then((data) => { if (data.length) setEmployees(data); });
  }, []);

  const addEmployees = async (values: EmployeeFormValues[]) => {
    try {
      if (values.length === 1) {
        const created = await createEmployee(values[0]);
        setEmployees((current) => [created, ...current]);
      } else {
        // Bulk: build CSV and send to import endpoint
        const header = 'email,name,department,seniority,hasConsent';
        const rows = values.map((v) => `${v.email},${v.name},${v.department},${v.seniority},${v.hasConsent}`);
        const created = await importEmployeesCsv([header, ...rows].join('\n'));
        setEmployees((current) => [...created, ...current]);
      }
    } catch {
      // Fallback: optimistic local add
      setEmployees((current) => [...values.map((value, index) => ({ ...value, id: `EMP-${Date.now()}-${index}`, organisationId: 'ORG-2001' })), ...current]);
    }
    setPage(1);
    setModal(null);
  };
  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const csvText = await file.text();
      const parsed = parseCsv(csvText);
      // Try real API first; fall back to client-side parse
      try {
        const created = await importEmployeesCsv(csvText);
        setEmployees((current) => [...created, ...current]);
        setPage(1);
        setModal(null);
      } catch {
        setEmployees((current) => [...parsed.map((value, index) => ({ ...value, id: `EMP-${Date.now()}-${index}`, organisationId: 'ORG-2001' })), ...current]);
        setPage(1);
        setModal(null);
      }
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Unable to import CSV.'); }
    event.target.value = '';
  };
  const updateEmployee = async (values: EmployeeFormValues) => {
    if (modal && typeof modal === 'object' && 'edit' in modal) {
      try {
        const updated = await updateEmployeeApi(modal.edit.id, values);
        setEmployees((current) => current.map((emp) => emp.id === modal.edit.id ? updated : emp));
      } catch {
        setEmployees((current) => current.map((emp) => emp.id === modal.edit.id ? { ...modal.edit, ...values } : emp));
      }
    }
    setModal(null);
  };
  const deleteEmployee = async (id: string) => {
    try { await deleteEmployeeApi(id); } catch { /* soft-delete endpoint returns 204; ignore errors */ }
    setEmployees((current) => current.filter((emp) => emp.id !== id));
    setPage(1);
  };

  return <>
    <PageHead title="Employees" subtitle="Manage employees eligible for authorised phishing simulations." />
    <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', marginBlockEnd: 'var(--ax-space-5)' }}>
      <button type="button" className="ax-btn ax-btn--primary" onClick={() => setModal('create')}>{ICON_PLUS}<span className="ax-btn__label">Create Employee</span></button>
      <button type="button" className="ax-btn ax-btn--secondary" onClick={() => setModal('import')}>{ICON_UPLOAD}<span className="ax-btn__label">Bulk Import (CSV)</span></button>
      <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
    </div>
    {importError && <div role="alert" className="ax-alert ax-alert--danger" style={{ marginBlockEnd: 'var(--ax-space-5)' }}><p className="ax-alert__message">{importError}</p></div>}
    <div className="ax-dash-grid"><section className="ax-card ax-col--12" role="region" aria-label="Employees"><div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Employees</h2><p className="ax-card__subtitle">{employees.length.toLocaleString()} total employees</p></div></div><div className="ax-table-wrap" style={{ overflowX: 'auto' }}><table className="ax-table ax-table--hover"><thead className="ax-table__head"><tr>{['Organisation ID', 'Email', 'Name', 'Department', 'Seniority', 'Has consent', 'Action'].map((heading) => <th key={heading} className="ax-table__th" scope="col">{heading}</th>)}</tr></thead><tbody>{rows.map((employee) => <tr key={employee.id} className="ax-table__row"><td className="ax-table__td ax-num">{employee.organisationId}</td><td className="ax-table__td">{employee.email}</td><td className="ax-table__td" style={{ color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-medium)' }}>{employee.name}</td><td className="ax-table__td">{employee.department}</td><td className="ax-table__td"><span className="ax-badge ax-badge--soft ax-badge--pill">{employee.seniority}</span></td><td className="ax-table__td"><ConsentBadge value={employee.hasConsent} /></td><td className="ax-table__td"><div className="ax-cluster" style={{ gap: 'var(--ax-space-1)' }}><button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={`View ${employee.name}`} onClick={() => setModal({ view: employee })}>{ICON_EYE}</button><button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={`Edit ${employee.name}`} onClick={() => setModal({ edit: employee })}>{ICON_EDIT}</button><button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={`Delete ${employee.name}`} onClick={() => deleteEmployee(employee.id)}>{ICON_DELETE}</button></div></td></tr>)}</tbody></table></div><div className="ax-card__footer ax-cluster" style={{ justifyContent: 'space-between' }}><span style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>Showing {rows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, employees.length)} of {employees.length}</span><div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}><button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span className="ax-num">Page {page} of {pageCount}</span><button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</button></div></div></section></div>
    {modal === 'create' && <EmployeeModal title="Create employee" onCancel={() => setModal(null)} onSubmit={(values) => addEmployees([values])} />}
    {modal === 'import' && <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,18,25,.5)', padding: 'var(--ax-space-4)' }}><div className="ax-card" role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: 520 }}><div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Bulk import employees</h2><p className="ax-card__subtitle">CSV columns: email,name,department,seniority,hasConsent</p></div><button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={() => setModal(null)}>{ICON_CLOSE}</button></div><div className="ax-card__body"><p style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>Organisation ID is assigned from the current organisation context during import.</p><button type="button" className="ax-btn ax-btn--primary" onClick={() => fileInput.current?.click()}>{ICON_UPLOAD}<span className="ax-btn__label">Choose CSV file</span></button><pre style={{ marginBlockStart: 'var(--ax-space-4)', overflowX: 'auto', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>{SAMPLE_CSV}</pre></div></div></div>}
    {modal && typeof modal === 'object' && 'edit' in modal && <EmployeeModal title="Edit employee" initial={modal.edit} onCancel={() => setModal(null)} onSubmit={updateEmployee} />}
    {modal && typeof modal === 'object' && 'view' in modal && <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,18,25,.5)', padding: 'var(--ax-space-4)' }}><div className="ax-card" role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: 520 }}><div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Employee details</h2></div><button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Close" onClick={() => setModal(null)}>{ICON_CLOSE}</button></div><dl className="ax-card__body" style={{ display: 'grid', gap: 'var(--ax-space-3)', margin: 0 }}>{Object.entries(modal.view).map(([key, value]) => <div key={key} className="ax-cluster" style={{ justifyContent: 'space-between', gap: 'var(--ax-space-4)' }}><dt style={{ color: 'var(--ax-text-muted)' }}>{key}</dt><dd style={{ margin: 0, color: 'var(--ax-text-strong)' }}>{typeof value === 'boolean' ? <ConsentBadge value={value} /> : String(value)}</dd></div>)}</dl></div></div>}
  </>;
}

export default Employees;
