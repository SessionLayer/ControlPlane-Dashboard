# F-obs-1: recording replay/export object download had no client-side timeout (no bounded fail-closed)

- Severity: low
- Status: Verified-Fixed
- Area: obs

## Fix (S23)

`fetchObjectBytes` (`src/features/observability/replay.ts`) now bounds the
object-store/CDN download with `AbortSignal.timeout` (default 60s, generous for
large recordings; injectable via `loadReplayCast`/`loadExportBytes` `{timeoutMs}`).
The signal covers BOTH the response headers and the body read, so a hung/black-holed
leg tears the request down and surfaces a clear "Recording download timed out …"
error instead of spinning forever. Regression:
`replay.test.tsx::"FAILS CLOSED with a bounded timeout when the object store hangs
(F-obs-1)"` (a 2s-hanging object store + a 20ms injected bound → rejects with a
timeout error). The `api/client.ts` default request deadline (reads + action POSTs)
is the broader foundation follow-up noted below; the direct object leg — the one
that spins on "Decrypting recording…" — is closed.

---

## Summary

The observability recording-replay path and the shared Control Plane client issue
bare `fetch()` calls with no `AbortController` and no wall-clock deadline, so a
hung object-store/CDN or Control Plane connection has no bounded failure — the UI
spins indefinitely rather than failing closed on a timeout.

- `src/features/observability/replay.ts::fetchObjectBytes` does
  `fetch(signed.url, { method: signed.method })` with no `signal` and no timeout.
  This is the direct-to-object-store leg (deliberately not the api client). A
  stalled CDN/object store leaves Replay/Export stuck on the "Decrypting
  recording…" spinner forever.
- `src/api/client.ts` builds the openapi-fetch client with
  `fetch: (request) => fetch(request)` and injects no default timeout. List/search
  reads DO thread TanStack Query's `signal` (`src/api/http.ts`), so those abort on
  unmount/gc — but there is still no time-based deadline, and the action POSTs
  (replay/export/legal-hold/delete) pass no signal at all.

Found while assessing the Dashboard's fail-closed surface for A8-reliability-red's
degradation-matrix audit (the "missing timeouts" focus). Filed here per that
audit's request so it is tracked in the no-defer gate.

## Impact

Low. The user-visible effect is "hangs / never plays / spinner forever" on a
degraded network leg — an availability/UX gap, **not** a security bypass: there is
no wrong-allow, no plaintext exposure (decryption still requires the in-memory
customer key), and the private key still never leaves the browser. The replay
dialog already cancels state updates on unmount (`cancelled` flag), so a stuck
request cannot write into an unmounted tree — but it does not `abort()` the
in-flight request, so the connection and promise leak until the browser times out
the socket (which can be minutes, or never behind a black-hole).

## Evidence

- `src/features/observability/replay.ts:31` — `await fetch(signed.url, { method: signed.method })` (no `signal`).
- `src/api/client.ts:65` — `fetch: (request) => fetch(request)` (no timeout wrapper).
- `src/api/http.ts` threads `signal` into `api.GET(..., { signal })` for cursor lists only (unmount/gc abort, not a deadline).

## Suggested fix (owner: team-lead / foundation)

`replay.ts` and `api/client.ts` are foundation/lead-owned, so this is flagged, not
self-fixed. Proposed:

1. `fetchObjectBytes(signed, expectedSize, { timeoutMs })`: create an
   `AbortController`, `AbortSignal.timeout(timeoutMs)` (or a `setTimeout(() =>
ctrl.abort(), timeoutMs)` cleared in `finally`), pass `signal` to `fetch`, and
   map an `AbortError` to a clear "Recording download timed out" message so the
   existing `DecryptError`/`ExportDialog` surfaces it as a graceful, bounded
   failure. Wire the dialogs' `cancelled` cleanup to also `abort()` the controller
   so closing the dialog tears the request down.
2. Give the openapi-fetch client a default request timeout (an `AbortSignal.timeout`
   composed with any caller `signal`) so every CP call — reads and action POSTs —
   has a wall-clock bound.

Suggested default: a few seconds for CP API calls; a longer bound (tens of seconds)
for the object download, which can be a large recording. Add a Vitest that mocks a
never-resolving object fetch and asserts the player surfaces a timeout error rather
than hanging (fake timers). I'm the natural implementer for the `replay.ts` +
observability-test portion if the lead assigns it.

## References

Companion to [F-sec-1](./F-sec-1.md) (the SLREC1 size-integrity fail-closed on the
same download path). A8-reliability-red is folding a pointer to this into the
cross-repo degradation matrix; the backend legs of "missing timeouts" (CP↔GW gRPC,
CA-signer, object-store PUT) are tracked separately in that matrix, not here.
