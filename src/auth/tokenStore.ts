/**
 * In-memory holder for the OIDC bearer token (Design §5.7; SESSION-19 security
 * posture). The token lives ONLY in this module's closure — never in
 * localStorage/sessionStorage, which are XSS-exfiltratable. It dies with the tab;
 * a reload re-runs the silent/interactive OIDC flow. The openapi-fetch middleware
 * reads it per request; nothing else may.
 */
let bearer: string | undefined;

const listeners = new Set<() => void>();
let unauthorizedHandler: (() => void) | undefined;

export function getBearer(): string | undefined {
  return bearer;
}

export function setBearer(token: string | undefined): void {
  bearer = token;
  for (const l of listeners) l();
}

export function clearBearer(): void {
  setBearer(undefined);
}

/** Subscribe to bearer changes (for React `useSyncExternalStore`). */
export function subscribeBearer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Register the callback the client middleware invokes on a `401` (session
 * expired / token rejected). The AuthContext points this at "clear + redirect to
 * login". Kept out of the token module's data so a 401 can never be swallowed.
 */
export function setUnauthorizedHandler(fn: (() => void) | undefined): void {
  unauthorizedHandler = fn;
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
