/*
 * Phause — Logout / signed-out screen (route "pages/logout").
 *
 * On mount: clears the auth store (both tokens, role, permissions).
 * Auto-redirects to /admin/login after 5 seconds (cancellable).
 * "Sign in again" → /admin/login
 * "Back to home"  → /admin/login (same — no unauthenticated home)
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { BrandInline } from '../auth/authShared';

const LOGIN_PATH = '/admin/login';
const COUNTDOWN  = 5;

export function Logout() {
  const [seconds, setSeconds]   = useState(COUNTDOWN);
  const [cancelled, setCancelled] = useState(false);
  const cancelledRef = useRef(false);
  const navigate     = useNavigate();

  // grab display info BEFORE clearing
  const userRole  = useAuthStore((s) => s.userRole);
  const clearAll  = useAuthStore((s) => s.clearAll);

  const roleLabel = userRole === 'admin' ? 'Super Admin' : userRole === 'org_user' ? 'Org User' : 'User';
  const roleColor = userRole === 'admin' ? 'var(--ax-accent)' : 'var(--ax-viz-emerald)';

  // clear session on mount
  useEffect(() => {
    clearAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // countdown
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (cancelledRef.current) return;
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          navigate(LOGIN_PATH, { replace: true });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const cancel = () => { cancelledRef.current = true; setCancelled(true); };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-6)', background: 'var(--ax-canvas)' }}>

      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--ax-space-6)' }}>

        {/* brand */}
        <BrandInline />

        {/* card */}
        <div className="ax-card" style={{ width: '100%', borderRadius: 'var(--ax-radius-xl)' }}>
          <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--ax-space-5)', padding: 'var(--ax-space-8)' }}>

            {/* icon */}
            <span aria-hidden="true" style={{ display: 'inline-grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in oklch,var(--ax-accent) 12%,transparent)', color: 'var(--ax-accent)' }}>
              <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 8v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" />
                <path d="M9 12h12l-3-3" /><path d="M18 15l3-3" />
              </svg>
            </span>

            <div>
              <h1 style={{ margin: 0, fontFamily: 'var(--ax-font-display)', fontWeight: 600, fontSize: 'var(--ax-text-2xl)', color: 'var(--ax-text-strong)' }}>
                You've signed out
              </h1>
              <p style={{ margin: 'var(--ax-space-2) 0 0', fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)', lineHeight: 1.6 }}>
                Your session has ended securely. Sign back in to return to your workspace.
              </p>
            </div>

            {/* role chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-3)', padding: 'var(--ax-space-3) var(--ax-space-4)', width: '100%', background: 'var(--ax-surface-subtle)', border: '1px solid var(--ax-border)', borderRadius: 'var(--ax-radius-md)', textAlign: 'start' }}>
              <span style={{ width: 36, height: 36, borderRadius: 'var(--ax-radius-md)', background: `color-mix(in oklch,${roleColor} 15%,transparent)`, color: roleColor, display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
                {userRole === 'admin' ? (
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                )}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>
                  {roleLabel}
                </div>
                <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                  Session ended
                </div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: 'color-mix(in oklch,var(--ax-viz-emerald) 12%,transparent)', color: 'var(--ax-viz-emerald)', fontSize: 'var(--ax-text-xs)', fontWeight: 600, flexShrink: 0 }}>
                <i style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ax-viz-emerald)' }} />
                Secure
              </span>
            </div>

            {/* actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)', width: '100%' }}>
              <Link
                className="ax-btn ax-btn--primary ax-btn--block"
                to={LOGIN_PATH}
              >
                <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 8v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/>
                  <path d="M21 12H8l3-3"/><path d="M11 15l-3-3"/>
                </svg>
                <span className="ax-btn__label">Sign in again</span>
              </Link>
            </div>

            {/* countdown */}
            <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-subtle)' }} aria-live="polite">
              {cancelled ? (
                <span>Auto-redirect cancelled.</span>
              ) : (
                <>
                  Redirecting to sign in in{' '}
                  <b style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text)' }}>{seconds}</b>
                  {' '}second{seconds !== 1 ? 's' : ''}…
                  <button
                    type="button"
                    className="ax-btn ax-btn--link ax-btn--sm"
                    onClick={cancel}
                    style={{ padding: 0, minHeight: 'auto', marginLeft: 4 }}
                  >
                    Stay here
                  </button>
                </>
              )}
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Logout;
