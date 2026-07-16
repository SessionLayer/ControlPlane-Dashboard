# F-ux-8: light-theme `warn` badge text drops below AA contrast on hovered/surface-2 rows

- Severity: low
- Status: Verified-Fixed
- Area: ux

## Issue

The light-theme warn token is `--warn: #9a6b00` (`src/index.css:13`), used as the
text color of `.badge-warn` (border+text via `currentColor`,
`src/index.css:369-371`). Measured WCAG contrast (sRGB) of `#9a6b00`:

- on `--surface` `#ffffff`: **4.69:1** — passes AA (4.5:1) but only barely.
- on `--surface-2` `#eef1f4`: **4.14:1** — **fails** AA for normal text.

Table rows set their hover background to `--surface-2`
(`src/index.css:496-498`), and warn badges appear in table cells (e.g. node
status "quarantined", recording legal-hold "On hold", JIT/lock states,
break-glass "pending"). Badge text is 0.78rem (~12.5px) bold — not "large text",
so the 4.5:1 threshold applies. Dark theme is fine (`#d6a53a` ≥ 6:1 everywhere).

## Impact

Warn-toned status badges — precisely the ones flagging items that need attention —
fall below AA contrast whenever their row is hovered (and anywhere a warn badge
sits on a surface-2 panel). The resting-state 4.69:1 also leaves no margin. Low
severity because it is marginal and mostly transient (hover state), but it is a
real AA dip in a rendered state.

## Fix

Darken the light `--warn` token slightly so it clears 4.5:1 on `--surface-2` too
(e.g. `#8a5f00` ≈ 5.0:1 on `#eef1f4`), or give badges an explicit background so
their contrast is measured against a fixed surface rather than the row hover
color. Re-run the contrast check for warn on `#ffffff`, `#eef1f4`, and `#f6f7f9`.

## Resolution (Session 19)

Light-theme --warn darkened #9a6b00 -> #855c00 (~5.2:1 on --surface-2, passes AA 4.5:1) in both :root and :root[data-theme=light] (src/index.css).
