# F-net-1: default Control Plane base URL is plaintext HTTP

- Severity: low
- Status: Accepted-Risk
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

Partial mitigation applied now: an empty/whitespace `VITE_CP_BASE_URL` falls back
to the documented default instead of silently becoming a relative base. The
remaining hardening — a build-time assertion that a non-localhost base is
`https://` — is deferred to when auth is wired (Session 17) and is recorded in
`CLAUDE.md` (Security posture). Revisit and downgrade to Verified-Fixed then.
