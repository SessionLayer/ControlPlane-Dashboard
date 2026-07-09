import createClient from 'openapi-fetch';

import type { paths } from './schema';

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
