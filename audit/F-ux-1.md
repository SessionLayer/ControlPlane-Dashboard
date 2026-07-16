# F-ux-1: table row-click opens detail/edit/delete with no keyboard or screen-reader equivalent

- Severity: high
- Status: Verified-Fixed
- Area: ux

## Issue

The shared `DataTable` primitive attaches the row action as a bare `onClick` on
the `<tr>` with only a `cursor: pointer` style — no `tabIndex`, no `role`, no
`onKeyDown`:

`src/ui/Table.tsx:55-66`

```tsx
<tr
  className={onRowClick !== undefined ? 'row-clickable' : undefined}
  onClick={onRowClick !== undefined ? () => { onRowClick(row); } : undefined}
>
```

Nine screens use this as the **only** affordance to open a resource's
detail / edit / delete flow (verified: none of them render an in-cell button):

- `src/features/access/RolesScreen.tsx:198`
- `src/features/access/RulesScreen.tsx:287`
- `src/features/access/RoleBindingsScreen.tsx:254`
- `src/features/access/ServiceAccountsScreen.tsx:420`
- `src/features/access/CasScreen.tsx:299`
- `src/features/policies/NodePoliciesScreen.tsx:69`
- `src/features/policies/CapabilityDefsScreen.tsx:65`
- `src/features/policies/BreakglassPoliciesScreen.tsx:80`
- `src/features/policies/JitPoliciesScreen.tsx:90`

(The scaffolds `CrudScreen` / `CrudList` pass `onRowClick` straight through —
`src/features/policies/common.tsx:58,85`, `src/features/access/common.tsx:44`.)

## Impact

WCAG 2.1.1 Keyboard (Level A) failure. On these nine admin surfaces a
keyboard-only or screen-reader user can create new resources (the header button
is a real `<button>`) but **cannot open, view, edit, or delete any existing
one** — the row is mouse-only. A non-interactive `<tr>` is also never announced
as actionable, so an AT user has no cue the row does anything. As a side effect,
because the clicked `<tr>` is not focusable, `Dialog` restores focus to
`document.body` on close (see `src/ui/Dialog.tsx:33-35`), dropping keyboard focus
to the top of the page after every edit.

Audit search, recordings, nodes, sessions, JIT, locks and break-glass are NOT
affected — they expose explicit in-row `<Button>`s (e.g.
`src/features/observability/AuditScreen.tsx:39-52`) and merely offer row-click as
a redundant shortcut.

## Fix

Make the row affordance keyboard-operable in the one shared primitive. Preferred:
render the row's primary cell as a real `<button>` (best SR semantics). Minimal:
when `onRowClick` is set, give the `<tr>` `tabIndex={0}`, `role="button"`, an
`aria-label`, and an `onKeyDown` that fires on `Enter`/`Space`:

```tsx
onKeyDown={onRowClick && ((e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); }
})}
tabIndex={onRowClick ? 0 : undefined}
role={onRowClick ? 'button' : undefined}
```

Add a visible `:focus-visible` style for `.row-clickable`. Fixing the primitive
resolves all nine screens (and the focus-return regression) at once.

## Resolution (Session 19)

DataTable clickable rows are now keyboard-operable: role="button", tabIndex=0, and Enter/Space activate (src/ui/Table.tsx). Fixes all 9 config screens at once; focus returns to the row when a row-opened dialog closes. Regression test: src/ui/Table.test.tsx.
