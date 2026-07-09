# F-ui-1: malformed 2xx Control Plane response could white-screen the admin tab

- Severity: low
- Status: Verified-Fixed
- Area: ui

## Summary

`openapi-fetch` casts a 200 body to the typed shape without runtime validation.
A breached or buggy Control Plane (in the threat model — the dashboard is a
client of a Tier-0 service) returning a 200 whose `VersionInfo.protocols` is
absent would make `HealthVersionPanel` throw while dereferencing
`version.data.protocols.controlPlaneGatewayGrpc.min`. With no router
`errorComponent`/error boundary, the throw unmounted the route tree into a blank
screen — a self-inflicted denial of the admin's view. Network/query errors were
already handled via `isError`; only malformed-but-2xx bodies hit this path.

Reported by the scaffold security review (security-reviewer, LOW-1).

## Fix

`src/router.tsx` now sets `defaultErrorComponent` (`RouteError`) on the router, so
a render-time throw degrades to an inline "Something went wrong" panel instead of
a white screen. Covered by the existing build/lint/test gate.
