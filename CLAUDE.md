# ControlPlane-Dashboard — agent & contributor guide

The **SessionLayer Control Plane Dashboard**: the admin web UI for a Zero-Trust
SSH access platform. It is a **client of the OpenAPI contract** (Design §13,
FR-API-1/2) — it talks only to the Control Plane REST API, never to Postgres, the
Gateway, or the coordination bus.

Stack: **Vite + React 19 + TypeScript (strict)**, **TanStack Query** (data),
**TanStack Router** (routing, code-based), **Vitest + Testing Library + MSW**
(unit), **Playwright** (E2E). Node **22** (`.nvmrc`), npm **10.9.8**
(`packageManager`).

## Contract-first: the client is generated, never hand-written

The typed API client is generated from the OpenAPI spec — do **not** hand-edit
generated types.

- **Canonical spec** lives upstream in `ControlPlane-API/contracts/openapi/openapi.yaml`
  and is **FROZEN** per session. CI checks out this repo alone, so the spec is
  **vendored** (committed) at `openapi/openapi.yaml`.
- Re-vendor with `npm run sync-contracts` (copies from the sibling repo if
  present; no-op with a note otherwise).
- `npm run generate:api` regenerates `src/api/schema.d.ts` (via
  `openapi-typescript`); `src/api/client.ts` wraps it with `openapi-fetch`.
- **Drift check (CI-enforced):** `npm run generate:api && git diff --exit-code -- src/api`.
  If this fails, the checked-in client is stale — regenerate and commit. If the
  _spec_ itself changed, that is an upstream contract change: follow
  `contracts/VERSIONING.md` and re-vendor.

`src/api/schema.d.ts` is generated output: it is excluded from ESLint and
Prettier and must match the generator verbatim.

## Guardrails (enforced by the gate)

- **Strict TypeScript** + **type-checked ESLint** (`typescript-eslint`
  strict + stylistic, type-aware). Both `tsconfig.app.json` (browser) and
  `tsconfig.node.json` (tooling + E2E) are strict with `noUncheckedIndexedAccess`.
- **Prettier** owns formatting; `npm run lint` runs ESLint **and** `prettier --check`.
- The Control Plane base URL defaults to `http://localhost:8080` (single-instance
  mode) and is overridable at build time via `VITE_CP_BASE_URL`. No secrets in the
  repo or the bundle.

## Security posture

Reviewed by red-team + security-reviewer at scaffold time — zero medium+ findings.
Points carried forward:

- **Production serving layer sends the security headers** the static bundle cannot
  set itself — **delivered** as a reference serving layer under `deploy/`
  (`security-headers.conf`, `nginx.conf`, `_headers`, `Dockerfile`): a strict
  `Content-Security-Policy` (`default-src 'self'`, `script-src`/`style-src 'self'`
  with no `'unsafe-inline'`, `frame-ancestors 'none'`, `object-src 'none'`), HSTS,
  and `X-Content-Type-Options: nosniff`. `connect-src` is `'self'` plus deploy-time
  placeholders for the CP / OIDC / object-store origins the app fetches from.
  Enforced only by the serving layer (not `index.html`); proven by
  `e2e/csp.spec.ts` + `deploy/headers.test.ts`. See `deploy/README.md`,
  `audit/F-headers-1.md`.
- **`VITE_CP_BASE_URL` must be `https://` in production** — **enforced at build
  time** by `deploy/httpsGuard.ts` (a Vite plugin wired in `vite.config.ts`), which
  fails `vite build` when `VITE_CP_BASE_URL` or any `VITE_OIDC_*` endpoint is a
  non-localhost cleartext value; `src/api/client.ts` keeps the runtime backstop.
  `http://localhost` / `127.0.0.1` and an empty value (→ the localhost default) are
  exempt. See `audit/F-net-1.md`.
- **Future auth (Session 17):** inject OIDC-bearer / mTLS credentials via an
  in-memory `openapi-fetch` middleware — **never** `localStorage`/`sessionStorage`
  (XSS-exfiltratable). Do not set `credentials: 'include'` cross-origin without a
  strict CP CORS policy (never `*` with credentials).
- The wildcard `access-control-allow-origin: *` in `e2e/smoke.spec.ts` is a
  Playwright **mock-response** header, confined to the test build; it never
  reaches shipped code.

## Commands

| Command                  | What                                                 |
| ------------------------ | ---------------------------------------------------- |
| `npm run dev`            | Vite dev server (`:5173`)                            |
| `npm run build`          | `tsc -b` (typecheck) + `vite build`                  |
| `npm run lint`           | type-checked ESLint + Prettier check                 |
| `npm run format`         | Prettier write                                       |
| `npm run test`           | Vitest unit/component (API mocked with MSW)          |
| `npm run test:e2e`       | Playwright smoke (API mocked via route interception) |
| `npm run generate:api`   | regenerate the typed client from the vendored spec   |
| `npm run sync-contracts` | re-vendor the spec from ControlPlane-API             |
| `./scripts/gate.sh`      | full ROUND_FINAL gate (also `make dash-gate`)        |

E2E needs the Chromium browser: `npx playwright install --with-deps chromium`
once (CI does this each run).

## The gate & audit/ROUND

`scripts/gate.sh` (CI + `make dash-gate` + project hook) runs, in order:
lint → build → unit test → E2E → `npm audit --audit-level=high` → contract drift
check → the audit/ROUND finding scan. It exits non-zero if any step fails or if
any `audit/F-*.md` finding is **Open** at severity **medium or higher**.

Findings live in `audit/F-<area>-<n>.md` with this exact front-matter (a grep in
the gate depends on it):

```
# F-<area>-<n>: <title>
- Severity: critical|high|medium|low|info
- Status: Open|Verified-Fixed|Accepted-Risk
- Area: <area>
```

`audit/STATE` tracks the round (`ROUND_DISCOVERY` while scaffolding/red-teaming;
`ROUND_FINAL` only when the gate is clean). An `npm audit` high in a **dev-only**
tool should be triaged (prefer upgrading); if genuinely unfixable, document it as
an **Accepted-Risk** finding with justification — never weaken the gate threshold.

## Scope discipline (per session)

Session One is **scaffolding + harness only**: the app shell and one health/version
page. **Real admin screens (nodes, rules, roles, sessions, recordings, JIT,
locks, …) are Session 17** — if you find yourself building them here, stop. Each
new resource screen is a client of the (by-then-expanded) OpenAPI contract.

## CI

`.github/workflows/ci.yml`: triggers on `push` + `pull_request`, top-level
`permissions: contents: read`, a **single job id `gate`** (the required check —
never rename it or add a matrix). Steps: checkout → setup-node (`.nvmrc`, npm
cache) → `npm ci` → `npx playwright install --with-deps chromium` →
`./scripts/gate.sh`. All actions are pinned to full commit SHAs.
