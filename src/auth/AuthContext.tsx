import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import type { PlatformPermission } from '../api/types';
import { decodeClaims, type UserClaims } from './claims';
import { isOidcConfigured, loadOidcConfig, type OidcConfig } from './config';
import {
  buildAuthorizeUrl,
  createTransient,
  exchangeCode,
  storeTransient,
  takeTransient,
} from './oidc';
import {
  clearBearer,
  getBearer,
  setBearer,
  setUnauthorizedHandler,
  subscribeBearer,
} from './tokenStore';

export interface AuthContextValue {
  status: 'authenticated' | 'unauthenticated';
  user: UserClaims | undefined;
  /** Whether the bearer carried explicit permission claims (else UI is optimistic). */
  permissionsKnown: boolean;
  configured: boolean;
  login: () => Promise<void>;
  logout: () => void;
  completeCallback: (search: string) => Promise<void>;
  /**
   * RBAC-aware affordance check. True if the user holds `perm`, OR the token
   * carried no permission claims at all (unknown → optimistic; the Control Plane
   * remains the authoritative gate and returns 403). Never a security boundary.
   */
  can: (perm: PlatformPermission) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  config = loadOidcConfig(),
  redirect = (url: string) => {
    window.location.assign(url);
  },
}: {
  children: ReactNode;
  config?: OidcConfig;
  redirect?: (url: string) => void;
}) {
  const bearer = useSyncExternalStore(subscribeBearer, getBearer, getBearer);
  const redirectRef = useRef(redirect);
  redirectRef.current = redirect;

  const user = useMemo(
    () => (bearer !== undefined ? decodeClaims(bearer) : undefined),
    [bearer],
  );
  const permissionsKnown = (user?.permissions.length ?? 0) > 0;

  const login = useCallback(async () => {
    if (!isOidcConfigured(config)) {
      throw new Error(
        'OIDC is not configured (set VITE_OIDC_ISSUER / endpoints).',
      );
    }
    const transient = createTransient();
    storeTransient(transient);
    redirectRef.current(await buildAuthorizeUrl(config, transient));
  }, [config]);

  const completeCallback = useCallback(
    async (search: string) => {
      const params = new URLSearchParams(search);
      const err = params.get('error');
      if (err !== null) {
        takeTransient();
        throw new Error(params.get('error_description') ?? err);
      }
      const code = params.get('code');
      const state = params.get('state');
      const transient = takeTransient();
      if (transient === undefined || code === null) {
        throw new Error('Missing PKCE state; restart the sign-in.');
      }
      if (state !== transient.state) {
        throw new Error('State mismatch; possible CSRF — sign-in rejected.');
      }
      const tokens = await exchangeCode(config, code, transient.verifier);
      // Bind the ID token to this auth request: if it carries a `nonce`, it must
      // match the one we sent (OIDC replay protection). Absent (e.g. an access
      // token fallback) → can't check, accept. Signature is still the CP's job.
      const nonce = decodeClaims(tokens.bearer).nonce;
      if (nonce !== undefined && nonce !== transient.nonce) {
        throw new Error('Nonce mismatch; sign-in rejected (possible replay).');
      }
      setBearer(tokens.bearer);
    },
    [config],
  );

  const logout = useCallback(() => {
    clearBearer();
  }, []);

  // A 401 from any Control Plane call clears the session; the RequireAuth guard
  // then routes to /login. Registered once for the app's lifetime.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearBearer();
    });
    return () => {
      setUnauthorizedHandler(undefined);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: bearer !== undefined ? 'authenticated' : 'unauthenticated',
      user,
      permissionsKnown,
      configured: isOidcConfigured(config),
      login,
      logout,
      completeCallback,
      can: (perm) =>
        !permissionsKnown || (user?.permissions.includes(perm) ?? false),
    }),
    [bearer, user, permissionsKnown, config, login, logout, completeCallback],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

/** Convenience hook for RBAC-aware affordances: `const canWrite = useCan('rbac:write')`. */
export function useCan(perm: PlatformPermission): boolean {
  return useAuth().can(perm);
}
