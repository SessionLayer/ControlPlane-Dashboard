# ControlPlane-Dashboard

Admin web UI for the **SessionLayer Control Plane** — a self-hosted, API-first
Zero-Trust SSH access platform. The dashboard is a **client of the OpenAPI
contract** (Design §13): it renders and drives the Control Plane's REST surface
and talks to nothing else.

> **Session One status.** This repo currently contains the **foundation
> scaffold** only: the Vite + React + TypeScript app shell and a single
> health/version page that calls `GET /v1/version` and `GET /v1/healthz` through
> the generated typed client. Real admin screens (nodes, rules, roles, sessions,
> recordings, JIT, locks, …) arrive in a later session.

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

## License

[GPL-3.0-only](./LICENSE).
