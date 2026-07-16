# F-rel-5: Export dialog has no cancellation guard — closing mid-decrypt still triggers a surprise file download

- Severity: low
- Status: Verified-Fixed
- Area: rel

## Issue

`ExportDialog.run()` kicks off `loadExportBytes(...)` and, on resolve,
unconditionally calls `downloadBytes(...)` and `setDone(true)`
(`src/features/observability/ExportDialog.tsx:40-56`). Unlike `ReplayDialog`,
which uses a `cancelled` flag in its effect cleanup
(`src/features/observability/ReplayDialog.tsx:63-83`), there is no guard here, and
the "Close" button is **not** disabled while `busy`
(`ExportDialog.tsx:64-66` — only the primary action is disabled).

## Impact

If the operator clicks "Download .cast", then closes the dialog (Close button,
Escape, or backdrop) while the sign → fetch-from-object-store → decrypt pipeline
is still running, the promise later resolves against an unmounted component and:

- `downloadBytes` fires anyway → a file the operator thought they cancelled lands
  in their Downloads folder (a decrypted recording — mildly surprising for a
  cancelled action), and
- `setBusy`/`setDone`/`setError` run post-unmount. React 19 no longer warns, so
  this is benign for correctness, but it confirms the flow has no unmount
  awareness.

No leak of a persistent timer/animation (unlike the player), so this is low, but
it is an unmount-race the sibling dialog already handles and this one does not.

## Fix

Mirror `ReplayDialog`: drive the export from a `useEffect`/guarded promise with a
`cancelled` (or `AbortController`) flag set on cleanup, and short-circuit
`downloadBytes`/`setState` when cancelled. Optionally disable the Close button
while `busy` so the intent is explicit.

## Resolution (Session 19)

ExportDialog now has an unmount cancel guard (no surprise download / setState after close) and disables Close while decrypting, mirroring ReplayDialog (src/features/observability/ExportDialog.tsx).
