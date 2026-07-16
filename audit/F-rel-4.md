# F-rel-4: Overview incident-signal tiles can show counts stale by up to 30s after an operator acts (separate cache namespace, no invalidation, no focus refetch)

- Severity: low
- Status: Verified-Fixed
- Area: rel

## Issue

The Overview reads its KPIs and incident lists from a dedicated `'overview'`
query-key namespace (`src/features/overview/queries.ts:17` and each hook, e.g.
`useActiveLocks` → `['cp','overview','locks']`, `usePendingJit` →
`['cp','overview','jit-pending']`, `useBreakglassActivations` →
`['cp','overview','breakglass']`). This was a deliberate choice (per the comment
at `queries.ts:15-16`) to keep landing-page reads independent of the per-resource
screens.

The IR/fleet mutations that change those very signals invalidate only their own
keys — e.g. `useReleaseLock`/`useCreateLock` invalidate `['cp','locks']`
(`src/features/ir/hooks.ts:146,160`), approve/deny/revoke invalidate
`['cp','jit-requests']` (`:83,97,111,125`), `useTerminateSession` invalidates
`['cp','sessions']` (`fleet/api.ts:202`). None of them touch the `'overview'`
namespace.

Combined with `staleTime: 30_000` and `refetchOnWindowFocus: false`
(`src/main.tsx:13-15`), an Overview visited within 30s of a change serves the
cached (pre-action) numbers without refetching.

## Impact

On the incident dashboard specifically: after an operator releases a lock,
approves the last JIT level, or reviews a break-glass activation on the IR screen
and returns to Overview, the "Active locks", "Pending JIT approvals", and
"Break-glass to review" tiles (and the corresponding lists) can under/over-count
for up to 30s. For a console whose purpose is incident triage, showing a
just-released lock as still active — or a just-approved request as still
pending — can misdirect the on-call. There is no data corruption; it self-heals
after `staleTime`, and the authoritative per-resource screens are always correct.

## Fix

Pick one:

- Have the IR/fleet mutations also `invalidateQueries({ queryKey: ['cp','overview'] })`
  (broad prefix) so the dashboard refreshes after an action, or
- Lower `staleTime` for the incident tiles (per-query override), or
- Drop the separate namespace and let the tiles share the canonical resource
  keys so existing invalidations cover them.

This is a deliberate tradeoff today; flagging because the staleness window lands
on the exact signals an incident dashboard exists to show.

## Resolution (Session 19)

Overview reads use staleTime:0 so the incident tiles refetch whenever the overview remounts, reflecting IR/fleet actions taken on other screens (src/features/overview/queries.ts).
