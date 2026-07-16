import createClient, { type Middleware } from 'openapi-fetch';

import type { paths } from './schema';
import { getBearer, notifyUnauthorized } from '../auth/tokenStore';

/**
 * Base URL of the Control Plane REST surface. The dashboard is a *client* of the
 * OpenAPI contract (Design §13); it never talks to Postgres or the Gateway
 * directly. Defaults to the local single-instance Control Plane
 * (`http://localhost:8080`, Design §10.1) and is overridable at build time via
 * `VITE_CP_BASE_URL`.
 */
const configuredBase = import.meta.env.VITE_CP_BASE_URL?.trim();
export const CP_BASE_URL: string =
  configuredBase !== undefined && configuredBase.length > 0
    ? configuredBase
    : 'http://localhost:8080';

function isLocalhost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

// Carried-forward scaffold finding: a non-localhost CP base MUST be https in a
// production build (the bearer would otherwise ride a cleartext channel). The
// http://localhost default is single-instance local dev only.
if (
  import.meta.env.PROD &&
  !isLocalhost(CP_BASE_URL) &&
  !CP_BASE_URL.startsWith('https://')
) {
  throw new Error(
    `VITE_CP_BASE_URL must be https:// in production (got "${CP_BASE_URL}")`,
  );
}

/**
 * Injects the in-memory OIDC bearer on every Control Plane request and turns a
 * `401` into a single "re-authenticate" signal. The token is read fresh per
 * request from the in-memory store (never a captured copy, never storage), so
 * the Authorization header always reflects the live session.
 */
const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = getBearer();
    if (token !== undefined) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401) {
      notifyUnauthorized();
    }
    return response;
  },
};

/**
 * The typed Control Plane client. `paths` is generated from the frozen OpenAPI
 * spec (`openapi/openapi.yaml`) into `./schema.d.ts` by `npm run generate:api` —
 * never hand-edit that file; the CI drift check reverts it to the contract.
 *
 * `fetch` is late-bound to the ambient global rather than captured at creation.
 * openapi-fetch otherwise snapshots `globalThis.fetch` when the client is built,
 * which bypasses interceptors installed afterwards (MSW in unit tests, Playwright
 * route mocking) if this module is imported first. The indirection is negligible
 * at runtime and keeps the data path test-observable.
 */
export const api = createClient<paths>({
  baseUrl: CP_BASE_URL,
  fetch: (request) => fetch(request),
});

api.use(authMiddleware);
