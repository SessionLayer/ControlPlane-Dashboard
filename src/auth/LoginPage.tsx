import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';

import { Button } from '../ui/Button';
import { ThemeToggle } from '../layout/theme';
import { useAuth } from './AuthContext';

/**
 * The unauthenticated landing. Starts the OIDC authorization-code + PKCE flow
 * (full-page redirect to the IdP). Already-authenticated visitors are sent to the
 * dashboard. No credentials are ever entered here — the IdP owns authentication.
 */
export function LoginPage() {
  const { status, configured, login } = useAuth();
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/" />;
  }

  const onSignIn = () => {
    setError(undefined);
    setBusy(true);
    login().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
      setBusy(false);
    });
  };

  return (
    <div className="login-screen">
      <div className="login-topbar">
        <ThemeToggle />
      </div>
      <section className="login-card panel" aria-labelledby="login-title">
        <h1 id="login-title" className="login-title">
          SessionLayer <span className="app-brand-sub">Control Plane</span>
        </h1>
        <p className="muted">
          Sign in with your organization identity provider to manage access,
          nodes, sessions, and recordings.
        </p>
        {configured ? (
          <Button variant="primary" onClick={onSignIn} disabled={busy}>
            {busy ? 'Redirecting…' : 'Sign in'}
          </Button>
        ) : (
          <p className="error" role="alert">
            OIDC is not configured. Set <code>VITE_OIDC_ISSUER</code> (and
            client id / endpoints) at build time.
          </p>
        )}
        {error !== undefined && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
