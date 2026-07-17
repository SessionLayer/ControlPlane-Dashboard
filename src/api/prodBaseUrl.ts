/**
 * Guard for the Control Plane base URL in a production build/runtime.
 *
 * A non-localhost Control Plane MUST be reached over `https://`: the OIDC bearer
 * rides the `Authorization` header on every request, so a cleartext base would
 * expose it on the wire (CLAUDE.md security posture; Design §10.1). The
 * `http://localhost:8080` default is single-instance local dev only.
 *
 * This is the browser-side runtime backstop (used by `client.ts`). The matching
 * build-time assertion lives in `vite.config.ts` — keep the two in sync.
 */

/** True when `url` points at loopback (the local-dev exemption). */
export function isLocalhostBase(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * An actionable error message iff `baseUrl` is an insecure production base
 * (non-localhost and not `https://`), otherwise `undefined`. An empty value is
 * allowed — it falls back to the `http://localhost` default, which is exempt.
 */
export function insecureProdBaseError(baseUrl: string): string | undefined {
  if (baseUrl.length === 0) return undefined;
  if (isLocalhostBase(baseUrl)) return undefined;
  if (baseUrl.startsWith('https://')) return undefined;
  return `VITE_CP_BASE_URL must be https:// in production (got "${baseUrl}")`;
}
