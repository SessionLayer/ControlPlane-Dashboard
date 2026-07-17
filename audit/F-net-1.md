# F-net-1: default Control Plane base URL is plaintext HTTP

- Severity: low
- Status: Verified-Fixed
- Area: net

## Summary

`src/api/client.ts` defaults `CP_BASE_URL` to `http://localhost:8080` when
`VITE_CP_BASE_URL` is unset. For an admin console of a security product, a
deployer who forgets to set the env var at build time would ship a UI that talks
to the Control Plane over cleartext. The `??` operator also did not catch an
explicitly empty `VITE_CP_BASE_URL=` (yielded a same-origin-relative base).

Reported by both scaffold reviewers (INFO / LOW-2).

## Triage — Accepted-Risk (with partial mitigation)

Accepted for Session One because: (a) there is **no authentication and no token**
in the scaffold yet, so no credential is exposed over cleartext; (b) the default
is localhost-only and single-instance mode is explicitly local (Design §10.1);
(c) the README documents the `https://` production override.

Partial mitigation applied at scaffold time: an empty/whitespace `VITE_CP_BASE_URL`
falls back to the documented default instead of silently becoming a relative base.

## Resolution — Verified-Fixed (Session 21, Part E)

The build-time assertion is now implemented as a Vite plugin (`deploy/httpsGuard.ts`,
wired in `vite.config.ts`): `vite build` **fails** when any credential-bearing
endpoint is a non-localhost cleartext `http://` value. It covers not just
`VITE_CP_BASE_URL` (which carries the OIDC bearer) but also the `VITE_OIDC_*`
endpoints (which carry the PKCE code exchange) — a plaintext OIDC endpoint in prod
is as dangerous as a plaintext CP base. `localhost`/`127.0.0.1`/`[::1]` and
unset/empty are exempt so single-instance dev and the E2E build still pass.
`src/api/client.ts` keeps the runtime backstop for the CP base. Verified by
building with a bad base (fails) and localhost/https bases (pass), and by the pure
`httpsBaseViolations()` unit tests in `deploy/headers.test.ts`. See
[F-headers-1](./F-headers-1.md) for the companion serving-layer headers.
