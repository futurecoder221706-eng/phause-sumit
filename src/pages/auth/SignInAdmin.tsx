/*
 * Phause — Unified login page.
 *
 * One URL (/admin/login), two modes:
 *   "admin"    — default. POST /admin/login → stores adminToken, redirects to /
 *   "org_user" — toggled by "Login as Org User" button. POST /api/auth/login
 *                → stores appToken, redirects to /
 *
 * The mode toggle is a pill switcher at the top of the form — no separate route.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthStandalone, OffappTools, BrandInline, EYE, EYE_OFF } from './authShared';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient, ApiError } from '../../api/client';

type Mode = 'admin' | 'org_user';

// ── icons ─────────────────────────────────────────────────────────────────────
const IC_SHIELD = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3" />
  </svg>
);
const IC_USER = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export function SignInAdmin() {
  const [mode, setMode]       = useState<Mode>('admin');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [reveal, setReveal]   = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const navigate      = useNavigate();
  const setAdminToken = useAuthStore((s) => s.setAdminToken);
  const setAppToken   = useAuthStore((s) => s.setAppToken);

  // reset form when switching modes
  function switchMode(m: Mode) {
    setMode(m);
    setEmail('');
    setPassword('');
    setEmailErr('');
    setPassErr('');
    setError('');
  }

  function validate() {
    const e = !email.trim()
      ? 'Enter your email.'
      : email.includes('@') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
        ? 'Enter a valid email address.'
        : '';
    const p = !password ? 'Enter your password.' : '';
    setEmailErr(e);
    setPassErr(p);
    return !e && !p;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'admin') {
        // ── Admin login ─────────────────────────────────────────────────
        const res = await apiClient.post<{
          token?: string; accessToken?: string; access_token?: string;
        }>('/api/admin/login', null, { email: email.trim(), password });

        const token = res.token ?? res.accessToken ?? res.access_token ?? '';
        if (!token) throw new Error('No token returned');
        setAdminToken(token);
        navigate('/', { replace: true });
      } else {
        // ── Org-user login ──────────────────────────────────────────────
        const res = await apiClient.post<{
          token?: string; accessToken?: string; access_token?: string;
          orgId?: string; organizationId?: string; org_id?: string;
          permissions?: string[];
        }>('/api/auth/login', null, { email: email.trim(), password });

        const token = res.token ?? res.accessToken ?? res.access_token ?? '';
        if (!token) throw new Error('No token returned');
        const orgId       = res.orgId ?? res.organizationId ?? res.org_id;
        const permissions = res.permissions ?? [];
        setAppToken(token, orgId, permissions);
        navigate('/', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError('Incorrect email or password. Please try again.');
      } else if (err instanceof ApiError && err.status === 404) {
        setError('Login endpoint not found. Please contact support.');
      } else {
        setError('Unable to sign in. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = mode === 'admin';

  return (
    <AuthStandalone cover>
      <div style={{ position: 'relative', zIndex: 1, minBlockSize: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-8) var(--ax-space-6)' }}>
        <OffappTools style={{ position: 'fixed', insetBlockStart: 'var(--ax-space-5)', insetInlineEnd: 'var(--ax-space-5)', zIndex: 5 }} />

        <div style={{ inlineSize: '100%', maxInlineSize: 440, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-6)' }}>

          {/* Brand */}
          <BrandInline />

          {/* ── Mode switcher pill ─────────────────────────────────────── */}
          <div
            role="group"
            aria-label="Login type"
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              background: 'var(--ax-surface-subtle)',
              borderRadius: 'var(--ax-radius-xl)',
              padding: 4,
              gap: 0,
            }}
          >
            {(['admin', 'org_user'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => switchMode(m)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 'var(--ax-space-2)',
                  padding: 'var(--ax-space-2) var(--ax-space-4)',
                  borderRadius: 'var(--ax-radius-lg)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: mode === m ? 600 : 400,
                  fontSize: 'var(--ax-text-sm)',
                  transition: 'all .15s',
                  background: mode === m ? 'var(--ax-surface-raised)' : 'transparent',
                  color: mode === m ? 'var(--ax-text-strong)' : 'var(--ax-text-muted)',
                  boxShadow: mode === m ? 'var(--ax-shadow-sm)' : 'none',
                }}
              >
                {m === 'admin' ? IC_SHIELD : IC_USER}
                {m === 'admin' ? 'Admin Login' : 'Org User Login'}
              </button>
            ))}
          </div>

          {/* ── Card ──────────────────────────────────────────────────── */}
          <div className="ax-card" style={{ borderRadius: 'var(--ax-radius-xl)' }}>
            <div className="ax-card__body" style={{ padding: 'var(--ax-space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>

              {/* heading */}
              <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-1)' }}>
                <h1 style={{ margin: 0, fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-2xl)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', letterSpacing: '-.015em' }}>
                  {isAdmin ? 'Admin Sign In' : 'Org User Sign In'}
                </h1>
                <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>
                  {isAdmin
                    ? 'Sign in with your super-admin credentials.'
                    : 'Sign in with your organisation user credentials.'}
                </p>
              </header>

              {/* role badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--ax-space-2)', padding: '4px 10px', borderRadius: 99, background: isAdmin ? 'color-mix(in oklch,var(--ax-accent) 12%,transparent)' : 'color-mix(in oklch,var(--ax-viz-emerald) 12%,transparent)', width: 'fit-content' }}>
                {isAdmin ? IC_SHIELD : IC_USER}
                <span style={{ fontSize: 'var(--ax-text-xs)', fontWeight: 600, color: isAdmin ? 'var(--ax-accent)' : 'var(--ax-viz-emerald)' }}>
                  {isAdmin ? 'Super Admin' : 'Organisation User'}
                </span>
              </div>

              {/* error alert */}
              {error && (
                <div role="alert" className="ax-alert ax-alert--danger" style={{ padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
                  <svg className="ax-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" />
                  </svg>
                  <div className="ax-alert__content">
                    <p className="ax-alert__message" style={{ color: 'var(--ax-danger-500)' }}>{error}</p>
                  </div>
                </div>
              )}

              {/* form */}
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }} noValidate>
                <div className="ax-field">
                  <label className="ax-label" htmlFor="si-email">Email</label>
                  <input
                    id="si-email" type="email"
                    className={`ax-input${emailErr ? ' is-invalid' : ''}`}
                    autoComplete="username"
                    placeholder={isAdmin ? 'admin@company.com' : 'you@organisation.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!emailErr}
                    aria-describedby={emailErr ? 'si-email-msg' : undefined}
                    required
                  />
                  {emailErr && <p id="si-email-msg" className="ax-field__message ax-field__message--error">{emailErr}</p>}
                </div>

                <div className="ax-field">
                  <div className="ax-cluster" style={{ justifyContent: 'space-between' }}>
                    <label className="ax-label" htmlFor="si-pass">Password</label>
                    <Link
                      className="ax-link"
                      to={isAdmin ? '/auth/reset-password-admin' : '/auth/reset-password-org'}
                      style={{ fontSize: 'var(--ax-text-xs)' }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="ax-field__control">
                    <input
                      id="si-pass"
                      className={`ax-input ax-input--with-trailing${passErr ? ' is-invalid' : ''}`}
                      autoComplete="current-password"
                      placeholder="••••••••••"
                      type={reveal ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!passErr}
                      aria-describedby={passErr ? 'si-pass-msg' : undefined}
                      required
                    />
                    <button
                      type="button"
                      className="ax-field__affix ax-field__affix--trailing ax-field__affix--button"
                      onClick={() => setReveal((v) => !v)}
                      aria-pressed={reveal}
                      aria-label={reveal ? 'Hide password' : 'Show password'}
                    >
                      {reveal ? EYE_OFF : EYE}
                    </button>
                  </div>
                  {passErr && <p id="si-pass-msg" className="ax-field__message ax-field__message--error">{passErr}</p>}
                </div>

                <label className="ax-check" style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text)' }}>
                  <input
                    type="checkbox" className="ax-checkbox"
                    checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Keep me signed in</span>
                </label>

                <button
                  type="submit"
                  className={`ax-btn ax-btn--primary ax-btn--lg ax-btn--block${loading ? ' is-loading' : ''}`}
                  aria-busy={loading}
                >
                  <span className="ax-btn__spinner" aria-hidden="true" />
                  <span className="ax-btn__label">
                    {isAdmin ? 'Sign in as Admin' : 'Sign in as Org User'}
                  </span>
                </button>
              </form>

              {/* divider + switch hint */}
              <div style={{ textAlign: 'center', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                {isAdmin ? (
                  <>Not an admin?{' '}
                    <button type="button" className="ax-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit', color: 'var(--ax-accent)', fontWeight: 600 }} onClick={() => switchMode('org_user')}>
                      Login as Org User
                    </button>
                  </>
                ) : (
                  <>Admin?{' '}
                    <button type="button" className="ax-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit', color: 'var(--ax-accent)', fontWeight: 600 }} onClick={() => switchMode('admin')}>
                      Switch to Admin Login
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>

          <p style={{ textAlign: 'center', margin: 0, fontSize: 'var(--ax-text-2xs)', color: 'var(--ax-text-subtle)' }}>
            By continuing you agree to the <Link className="ax-link" to="/pages/terms">Terms</Link> and <Link className="ax-link" to="/pages/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </AuthStandalone>
  );
}

export default SignInAdmin;
