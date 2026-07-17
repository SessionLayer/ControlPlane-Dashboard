/**
 * Guard for credential-bearing endpoints in a production build/runtime.
 *
 * A non-localhost endpoint MUST be reached over `https://`: the OIDC bearer rides
 * the `Authorization` header to the Control Plane, and the OIDC endpoints carry
 * the PKCE authorization-code exchange, so a cleartext value would expose them on
 * the wire (CLAUDE.md security posture; Design §10.1). The `http://localhost`
 * defaults are single-instance local dev only.
 *
 * This is the browser-side runtime backstop (used by `client.ts` for the CP base
 * and `auth/config.ts` for the OIDC endpoints). The matching build-time assertion
 * lives in `deploy/httpsGuard.ts` — keep the two in sync.
 */

/** True for loopback hosts (the local-dev exemption). */
export function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  );
}

/**
 * An actionable error message iff `url` is an insecure production endpoint
 * (non-empty, non-loopback, and not `https:`), otherwise `undefined`. Scheme
 * comparison is via the URL parser so an uppercase `HTTPS://` is accepted; an
 * empty value is allowed (it falls back to a localhost default). `name` labels the
 * offending env var in the message.
 */
export function insecureEndpointError(
  name: string,
  url: string,
): string | undefined {
  if (url.length === 0) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `${name} must be a valid https:// URL in production (got "${url}")`;
  }
  if (isLoopbackHost(parsed.hostname)) return undefined;
  if (parsed.protocol === 'https:') return undefined;
  return `${name} must be https:// in production (got "${url}")`;
}
