# ControlPlane-Dashboard

Admin web UI for the **SessionLayer Control Plane** — a self-hosted, API-first
Zero-Trust SSH access platform. The dashboard is a **client of the OpenAPI
contract** (Design §13): it renders and drives the Control Plane's REST surface
and talks to nothing else.

It covers the full admin surface — nodes, rules, roles and bindings, CAs,
sessions, JIT approvals, locks, join tokens, service accounts, break-glass,
session-limit policies, audit search, and recording replay/export. Admins sign
in with OIDC (auth-code + PKCE); the bearer lives in memory only. Recording
replay decrypts **client-side** (WebCrypto): the customer key never leaves the
browser and the platform never sees it.

## Quick start

```bash
nvm use              # Node 22 (see .nvmrc)
npm ci
npm run dev          # http://localhost:5173  (expects a Control Plane at :8080)
```

Point the dashboard at a Control Plane with `VITE_CP_BASE_URL` (default
`http://localhost:8080`):

```bash
VITE_CP_BASE_URL=https://controlplane.example npm run build
```

## Tech stack

- **Vite + React 19 + TypeScript** (strict, type-checked lint)
- **TanStack Query** — server-state / data fetching
- **TanStack Router** — routing (code-based)
- **openapi-typescript + openapi-fetch** — the typed API client, generated from
  the OpenAPI spec
- **Vitest + Testing Library + MSW** — unit/component tests (API mocked)
- **Playwright** — E2E smoke (API mocked via route interception)

## Contract-first

The typed client is **generated** from the OpenAPI contract and never
hand-written. The canonical spec lives in the `ControlPlane-API` repo and is
**vendored** here at `openapi/openapi.yaml`. Regenerate with
`npm run generate:api`; CI fails if the checked-in client drifts from the spec.
See [`CLAUDE.md`](./CLAUDE.md) for the full workflow, the gate, and scope
discipline.

## Scripts

`npm run` &nbsp;`dev` · `build` · `lint` · `format` · `test` · `test:e2e` ·
`generate:api` · `sync-contracts`. The full quality gate is `./scripts/gate.sh`
(or `make dash-gate` from the parent).

## Documentation

Operator and user documentation for the whole platform lives in the
[Documentation repository](https://github.com/SessionLayer/Documentation) —
including the Dashboard install (serving headers, CSP origins, the https
build-time guard) and the recording-replay security model. Deployment
references are under [`deploy/`](deploy/).

## License

[GPL-3.0-only](./LICENSE).
