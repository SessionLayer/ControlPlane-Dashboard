# F-headers-1: no Content-Security-Policy / security response headers

- Severity: info
- Status: Verified-Fixed
- Area: headers

## Summary

The SPA ships without a `Content-Security-Policy`, HSTS, `X-Content-Type-Options`,
`Referrer-Policy`, or framing controls. For a Zero-Trust admin console these are
worth pinning early.

Reported by both scaffold reviewers (INFO).

## Resolution — Verified-Fixed (Session 21, Part E)

For a static bundle these are **response headers set by the serving layer**, not
something a client-only bundle can set authoritatively (a `<meta http-equiv>` CSP
cannot know the deployment's CP/IdP/object-store origins and would break the
cross-origin `connect-src` the app needs). We now ship a reference serving layer
under `deploy/`:

- `security-headers.conf` — the strict CSP (`default-src 'self'`, `script-src
'self'`, `style-src 'self'` with **no `'unsafe-inline'`**, `frame-ancestors
'none'`, `object-src 'none'`, `base-uri 'self'`, `worker-src 'none'`), HSTS 2yr,
  `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP.
  `connect-src` lists placeholders for the three origins the app legitimately
  fetches from (CP API, OIDC token exchange, signed recording objects) so login
  and recording replay/export keep working; a single-origin deployment collapses
  it to `'self'`.
- `nginx.conf` — reference reverse proxy wiring the headers (with the
  add_header-inheritance re-include), SPA fallback, and asset caching.
- `Dockerfile` — builds `dist/` + serves it behind nginx, filling `connect-src`
  from `SL_CSP_CONNECT_SRC` at start (fail-closed to `'self'` when unset).
- `_headers` — the same header set for a static host (Netlify / Cloudflare Pages).
- `README.md` — the deployment contract and the rationale for each choice.

`style-src` stays strict with no `'unsafe-inline'`: the app's only inline styles
are React `style={{}}` props (CSSOM property writes), which CSP `style-src` does
not govern. This is **proven, not assumed** — `e2e/csp.spec.ts` enforces a CSP
that mirrors `security-headers.conf` exactly (`worker-src`/`frame-src 'none'`,
`upgrade-insecure-requests`, and the object-store `connect-src` origin) and
asserts zero `securitypolicyviolation`; `deploy/headers.test.ts` asserts the
strict directives are present and that `'unsafe-inline'`/`'unsafe-eval'` are
absent. See [F-net-1](./F-net-1.md) for the companion build-time https assertion.

T3 review (Session 21): confirmed no CSP bypass and no WebCrypto/OIDC/replay
regression. Per the review, the e2e now also drives the **recording-replay** path
(the most hostile data-rendering surface) — cross-origin object-store fetch → WebCrypto
decrypt → terminal player render — under the exact strict policy, with zero
violations, so the test is a real CSP-regression guard, not just a smoke.
