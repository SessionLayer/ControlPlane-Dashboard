# F-rel-1: Recording detail dialog shows stale legal-hold state and gives no feedback after a hold/release

- Severity: medium
- Status: Verified-Fixed
- Area: rel

## Issue

`RecordingDetails` renders entirely from the frozen list-row object it is handed
(`RecordingsScreen` stores the clicked row in `detailFor` and passes it as the
`recording` prop — `src/features/observability/RecordingsScreen.tsx:39`,
`:205-212`). The legal-hold affordance is derived from that snapshot:

- `src/features/observability/RecordingDetails.tsx:39` — `const held = recording.legalHold === true;`
- `:41-54` — `submitHold` mutates, and on success only `setHoldOpen(false)` /
  `setReason('')`; it never closes the outer dialog or refreshes the shown record.

`useSetLegalHold` invalidates `resourceKey('recordings')`
(`src/features/observability/recordingHooks.ts:56-58`), so the **list** behind the
dialog refreshes — but `detailFor` is a separate piece of state holding the old
object reference, so the still-open detail dialog is never updated.

## Impact

After an operator places (or releases) a legal hold:

1. The dialog still shows `Legal hold: —` (or `On hold`) from the pre-action
   snapshot — the displayed state actively contradicts what was just done.
2. The footer button keeps its old label (`Place legal hold`), so the operator
   **cannot reverse** the action from the same dialog — a just-placed hold cannot
   be released, and vice-versa, without closing and reopening.
3. There is no success confirmation at all (the confirm sub-dialog just
   disappears), so the operator has no signal the mutation even succeeded.

Legal hold is a compliance-relevant, audited action (WORM retention exemption).
Showing the wrong hold state with no confirmation is a real operability defect,
not cosmetics: at 3am it invites a double-toggle or a "did that work?" retry.

There is no `GET /v1/recordings/{recordingId}` single-resource endpoint
(`recordingHooks.ts` only has list + legal-hold + delete), so nothing re-reads the
row on its own.

## Fix

Any of, in order of preference:

- Drive the shown hold state from local state seeded by the prop and flipped on
  success: `const [held, setHeld] = useState(recording.legalHold === true)` and
  `setHeld(next)` in the `submitHold` `onSuccess`, plus a visible
  `role="status"` confirmation line. This keeps the button label and status
  correct after the toggle.
- Or close the outer dialog on a successful hold/release (like the delete path
  already does at `:56-63`) so the refreshed list is the source of truth, and the
  operator reopens on the fresh row.

(Delete already closes the dialog and is fine; only the hold/release path leaves a
stale, action-bearing view open.)

## Resolution (Session 19)

RecordingDetails now tracks legal-hold in local state, flipped on a successful hold/release, with a role="status" confirmation; the badge and button label update without reopening (src/features/observability/RecordingDetails.tsx).
