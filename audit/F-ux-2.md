# F-ux-2: modal dialog does not trap Tab focus (contradicts its own contract)

- Severity: medium
- Status: Verified-Fixed
- Area: ux

## Issue

`Dialog` documents itself as trapping focus — its JSDoc says it "moves focus into
the dialog on open (restoring it to the trigger on close)" and the component is
referenced elsewhere as one that "trap[s]/return[s] focus". In practice it moves
focus in on open, closes on Escape, and restores on close, but it **never
constrains Tab**:

`src/ui/Dialog.tsx:24-37` — the only keydown handler is for `Escape`; there is no
`Tab`/`Shift+Tab` cycling. Confirmed repo-wide: no focus-trap logic exists
(`grep 'Tab'` over `src/` finds only unrelated tab-strip code).

The overlay is also rendered inline (no portal) and the background is not marked
`inert`/`aria-hidden`, so every control behind the modal — sidebar nav, header
buttons, the underlying table — stays both focusable and operable.

## Impact

Keyboard and screen-reader users can Tab straight out of an open modal into the
obscured page underneath while `aria-modal="true"` asserts the opposite. Focus
"disappears" behind the dimmed backdrop with no visible focus location, and users
can activate hidden background actions. This is a Focus Order (WCAG 2.4.3) /
modal-contract defect affecting every dialog in the app (all create/edit/confirm
flows, the replay and export dialogs, the correlated-story view).

## Fix

Add a focus trap in `Dialog`: on `Tab`/`Shift+Tab`, query the panel's focusable
descendants and wrap focus from last→first and first→last, e.g.

```tsx
if (e.key === 'Tab') {
  const f = panelRef.current?.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
  );
  // clamp focus to first/last within the panel
}
```

Optionally set `aria-hidden`/`inert` on the app root while a dialog is open so the
background is removed from the tab order and the accessibility tree.

## Resolution (Session 19)

Dialog now traps Tab within the panel (wraps first<->last focusable) in addition to Escape/backdrop close (src/ui/Dialog.tsx). Regression test in src/ui/Dialog.test.tsx.
