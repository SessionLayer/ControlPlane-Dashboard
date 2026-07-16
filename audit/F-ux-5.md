# F-ux-5: skip-link target is not focusable

- Severity: low
- Status: Verified-Fixed
- Area: ux

## Issue

The shell provides a "Skip to content" link pointing at `#main`
(`src/layout/AppShell.tsx:20-22`), and the target is `<main id="main">`
(`src/layout/AppShell.tsx:67`). The `<main>` element has no `tabindex`, so it is
not focusable.

## Impact

Activating an in-page fragment link only reliably _moves keyboard focus_ to the
target if the target is focusable. With a non-focusable `<main>`, several browsers
scroll the page but leave focus on the skip link (or reset it to the document
body), so the next Tab resumes from the header/nav rather than inside the main
content — defeating the purpose of the skip link for keyboard users (WCAG 2.4.1
intent). This is the one interactive shell primitive the review brief calls out
("the sidebar nav + skip-link work").

## Fix

Make the landmark programmatically focusable: add `tabIndex={-1}` to
`<main id="main">` (and optionally `outline: none` via `:focus` since it receives
focus only programmatically). That lets the fragment navigation land focus inside
the content region across browsers.

## Resolution (Session 19)

Skip-link target is now <main id="main" tabIndex={-1}> so "Skip to content" reliably moves keyboard focus (src/layout/AppShell.tsx).
