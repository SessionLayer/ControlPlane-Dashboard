/**
 * OIDC relying-party configuration (Design §5.7; FR-AUTH-17). The dashboard is a
 * public SPA client using authorization-code + PKCE; the resulting ID token is
 * the bearer the Control Plane validates. All values are build-time env
 * (`VITE_OIDC_*`); the authorize/token endpoints default to conventional paths
 * derived from the issuer when not given explicitly.
 */
import { insecureEndpointError } from '../api/prodBaseUrl';

export interface OidcConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
  authorizeEndpoint: string;
  tokenEndpoint: string;
  scope: string;
}

function env(key: string): string | undefined {
  const v = import.meta.env[key] as string | undefined;
  const trimmed = v?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

function defaultRedirectUri(): string {
  if (typeof window === 'undefined')
    return 'http://localhost:5173/auth/callback';
  return `${window.location.origin}/auth/callback`;
}

export function loadOidcConfig(): OidcConfig {
  const issuer = env('VITE_OIDC_ISSUER') ?? '';
  const base = issuer.replace(/\/$/, '');
  const config: OidcConfig = {
    issuer,
    clientId: env('VITE_OIDC_CLIENT_ID') ?? 'sessionlayer-dashboard',
    redirectUri: env('VITE_OIDC_REDIRECT_URI') ?? defaultRedirectUri(),
    authorizeEndpoint:
      env('VITE_OIDC_AUTHORIZE_ENDPOINT') ?? (base ? `${base}/authorize` : ''),
    tokenEndpoint:
      env('VITE_OIDC_TOKEN_ENDPOINT') ?? (base ? `${base}/oauth2/token` : ''),
    scope: env('VITE_OIDC_SCOPE') ?? 'openid profile email',
  };
  // Runtime backstop (companion to the build-time deploy/httpsGuard.ts): a
  // production bundle must not carry a cleartext non-loopback OIDC endpoint — the
  // authorization code and token exchange would ride http. Fail closed at load.
  if (import.meta.env.PROD) {
    for (const [name, url] of [
      ['VITE_OIDC_ISSUER', config.issuer],
      ['VITE_OIDC_AUTHORIZE_ENDPOINT', config.authorizeEndpoint],
      ['VITE_OIDC_TOKEN_ENDPOINT', config.tokenEndpoint],
      ['VITE_OIDC_REDIRECT_URI', config.redirectUri],
    ] as const) {
      const insecure = insecureEndpointError(name, url);
      if (insecure !== undefined) throw new Error(insecure);
    }
  }
  return config;
}

/** True when enough is configured to start an interactive OIDC redirect. */
export function isOidcConfigured(config: OidcConfig): boolean {
  return config.authorizeEndpoint !== '' && config.tokenEndpoint !== '';
}
