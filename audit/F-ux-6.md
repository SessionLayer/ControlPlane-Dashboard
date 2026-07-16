# F-ux-6: break-glass tabs use tab roles but not the ARIA tab keyboard/panel pattern

- Severity: low
- Status: Verified-Fixed
- Area: ux

## Issue

The Break-glass screen renders a `role="tablist"` with three `role="tab"` buttons
carrying `aria-selected`, but implements none of the rest of the WAI-ARIA tabs
pattern:

`src/features/ir/BreakGlassScreen.tsx:57-76`

- All three tabs are ordinary `<button>`s, so they are each in the Tab sequence
  and there is no arrow-key navigation / roving `tabindex` (the pattern expects
  Left/Right to move between tabs and Tab to move to the panel).
- No `id` on the tabs and no `aria-controls` pointing at the content.
- The rendered content (`{tab === 'activations' && <ActivationsTab/>}` …) is a
  plain `<div>` — no `role="tabpanel"`, no `aria-labelledby` tying it back to its
  tab.

## Impact

Declaring `role="tab"`/`tablist"` makes assistive tech announce "tab, 1 of 3" and
sets the user's expectation of arrow-key movement and an associated panel; neither
is present, so the interaction model doesn't match the announced semantics and the
panel isn't identified as belonging to the selected tab. The controls remain
operable (they're buttons; Enter/Space works), so impact is limited to a confusing
SR experience rather than a hard block.

## Fix

Either (a) complete the pattern: roving `tabindex` (selected tab `0`, others `-1`)
with an Arrow-key handler on the tablist, `id`+`aria-controls` on each tab, and
`role="tabpanel"` + `aria-labelledby` + `tabIndex={0}` on the content container;
or (b) drop the tab roles and present them as a plain button group / segmented
control (simplest, and honest about the current keyboard behavior).

## Resolution (Session 19)

Full WAI-ARIA tabs implemented in src/features/ir/BreakGlassScreen.tsx (roving tabindex, ArrowLeft/Right + Home/End, role=tabpanel, aria-controls/aria-selected/aria-labelledby) + a contract test. (Fixed by teammate d-ir.)
