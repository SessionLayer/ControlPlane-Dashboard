# F-headers-1: no Content-Security-Policy / security response headers

- Severity: info
- Status: Accepted-Risk
- Area: headers

## Summary

The SPA ships without a `Content-Security-Policy`, HSTS, `X-Content-Type-Options`,
`Referrer-Policy`, or framing controls. For a Zero-Trust admin console these are
worth pinning early.

Reported by both scaffold reviewers (INFO).

## Triage — Accepted-Risk

For a static bundle these are **response headers set by the serving layer**
(reverse proxy / the Control Plane that hosts the UI), not something a client-only
scaffold can set authoritatively. Baking a `<meta http-equiv>` CSP now would
either be wrong (it cannot know the deployment's Control Plane origin, which is a
build-time value) or would break the cross-origin `connect-src` the app needs,
including the E2E build. The concrete requirement — strict CSP with `connect-src`
limited to the CP origin, `frame-ancestors 'none'`, HSTS, `nosniff` — is
documented in `CLAUDE.md` (Security posture) for the deployment story. Not
exploitable in-repo.
