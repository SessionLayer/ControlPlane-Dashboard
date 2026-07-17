import { loadEnv, type Plugin } from 'vite';

/**
 * Build-time TLS guard (closes F-net-1). The runtime throw in
 * `src/api/client.ts` fires only in the browser, after a broken bundle has
 * already shipped; this fails `vite build` itself when a credential-bearing
 * endpoint would ride cleartext.
 *
 * Every one of these carries a secret in production: `VITE_CP_BASE_URL` carries
 * the OIDC bearer to the Control Plane, and the OIDC issuer/endpoints carry the
 * PKCE authorization-code exchange. A non-localhost value for any of them MUST be
 * `https://`. `localhost`/`127.0.0.1`/`[::1]` and unset/empty (the single-instance
 * dev default, Design §10.1) are exempt so local dev and the Playwright E2E build
 * still pass.
 */
const HTTPS_REQUIRED_VARS = [
  'VITE_CP_BASE_URL',
  'VITE_OIDC_ISSUER',
  'VITE_OIDC_AUTHORIZE_ENDPOINT',
  'VITE_OIDC_TOKEN_ENDPOINT',
] as const;

function isLocalhost(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

/**
 * One message per credential-bearing var that is a non-localhost, non-`https://`
 * value. Empty/unset values are skipped (they fall back to the localhost dev
 * default). A pure function so the gate can test it without invoking a build.
 */
export function httpsBaseViolations(
  env: Record<string, string | undefined>,
): string[] {
  const violations: string[] = [];
  for (const name of HTTPS_REQUIRED_VARS) {
    const value = env[name]?.trim();
    if (value === undefined || value.length === 0) continue;
    if (isLocalhost(value)) continue;
    if (!value.startsWith('https://')) {
      violations.push(
        `${name} must be https:// in a production build (got "${value}")`,
      );
    }
  }
  return violations;
}

/**
 * Vite plugin that aborts a production build carrying an insecure endpoint. Runs
 * on `vite build` only (`apply: 'build'`) — never dev/preview — and reads only
 * `VITE_`-prefixed env from `.env` files and the inline environment via Vite's
 * own loader, so an inline `VITE_CP_BASE_URL=…` in CI is honoured.
 */
export function assertHttpsBasesPlugin(): Plugin {
  return {
    name: 'sl-assert-https-bases',
    apply: 'build',
    config(_config, { mode }) {
      const violations = httpsBaseViolations(
        loadEnv(mode, process.cwd(), 'VITE_'),
      );
      if (violations.length > 0) {
        throw new Error(
          `Insecure production build blocked:\n  - ${violations.join('\n  - ')}\n` +
            'Set an https:// endpoint, or a localhost value for single-instance dev.',
        );
      }
    },
  };
}
