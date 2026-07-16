# F-ux-4: `.link-button` class is referenced but never defined

- Severity: low
- Status: Verified-Fixed
- Area: ux

## Issue

The node-name and session-identity cells render their drill-in trigger as a
`<button className="link-button">`:

- `src/features/fleet/NodeList.tsx:43-49`
- `src/features/fleet/SessionPage.tsx:62-70`

There is no `.link-button` rule anywhere in the stylesheet set (verified:
`grep -rn link-button src --include=*.css` → no matches in `src/index.css` or any
feature CSS).

## Impact

With no styling, these render as **default user-agent buttons** — a grey, bordered
OS button dropped inside a data-table cell. It looks broken/inconsistent next to
the rest of the design system and, because it doesn't read as a link/affordance,
weakens the "click the name to open details" cue (the intended primary way to
open a node or session). Keyboard operability itself is fine (it is a real
`<button>`); this is a visual/affordance defect, not an access blocker.

## Fix

Add a `.link-button` rule to `src/index.css` styling it as an inline text link
(transparent background, no border, `color: var(--info)`, `padding: 0`,
`font: inherit`, pointer cursor, underline on hover/focus), or switch these cells
to the existing link styling. The global `:focus-visible` outline already covers
the focus state once the button is unstyled.

## Resolution (Session 19)

Added a .link-button style (inline text-link appearance) to src/index.css; the node/session name triggers now read as links.
