# F-ux-7: replay-player content min-width exceeds the shared Dialog max-width

- Severity: low
- Status: Verified-Fixed
- Area: ux

## Issue

The recording replay/export content declares a hard minimum width:

`src/features/observability/observability.css:87-92`

```css
.replay-dialog {
  min-width: min(78vw, 60rem);
}
```

but it is rendered inside the shared `Dialog`, whose panel is capped:

`src/index.css:652-659`

```css
.dialog {
  width: 100%;
  max-width: 38rem;
}
```

`ReplayDialog`/`ExportDialog` mount `<div className="replay-dialog">` inside
`<Dialog>` (`src/features/observability/ReplayDialog.tsx:88-89`,
`ExportDialog.tsx:59-77`). `.dialog-body` sets no `overflow-x`.

## Impact

On viewports wider than ~38rem, `min(78vw, 60rem)` resolves well above the
dialog's 38rem cap, so the player's fixed-min content is wider than its container.
The child overflows the rounded dialog panel (the terminal `.term` scrolls
internally, but the controls row — scrubber, speed buttons, "Show keystrokes" —
sits on `.replay-dialog` and can spill outside the panel / off the right edge).
The replay dialog is the marquee feature of this session, so a clipped or
overflowing control strip is a visible responsive defect. (Flagged low: the exact
rendered overflow should be confirmed visually, but the CSS width conflict is
concrete.)

## Fix

Give `Dialog` an opt-in wide/size variant (e.g. a `size="wide"` prop or a
`dialog--wide` class raising `max-width` to ~62rem) and use it for the replay and
export dialogs, instead of forcing width from the child via `min-width`. Then let
the content be `width: 100%` within that wider panel.

## Resolution (Session 19)

Shared Dialog gained a size="wide" variant (max-width min(78vw,60rem)); ReplayDialog/ExportDialog use it and the overflowing .replay-dialog min-width was removed (src/ui/Dialog.tsx, src/index.css, observability.css).
