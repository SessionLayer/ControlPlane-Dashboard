# F-ux-3: form controls don't expose required / invalid / description to assistive tech

- Severity: medium
- Status: Verified-Fixed
- Area: ux

## Issue

The shared form primitives label controls correctly (`<label htmlFor>`) but do not
wire any of the _state_ ARIA the design brief calls for. In `src/ui/Form.tsx`:

- **Required is visual-only.** `Field` renders the marker as
  `<span aria-hidden="true"> *</span>` (`src/ui/Form.tsx:25`) and the `required`
  prop is never passed to the underlying control — `TextField`
  (`src/ui/Form.tsx:68-78`), `NumberField`, `TextareaField`, `SelectField` all
  render `<input>/<select>/<textarea>` with **no** `required` or `aria-required`.
- **Invalid state is not conveyed.** No control ever sets `aria-invalid`
  (verified: `grep aria-invalid src` → none), including `JsonField` which computes
  a live validation error (`src/ui/Form.tsx:373-390`).
- **Hint and error are not associated.** The hint and the `role="alert"` error
  (`src/ui/Form.tsx:28-33`) are rendered as sibling `<p>`s with no
  `aria-describedby` link to the input (verified: `grep aria-describedby src` →
  none).

## Impact

WCAG 3.3.2 (Labels or Instructions), 4.1.2 (Name, Role, Value) and 1.3.1 gaps on
every form in the app. A screen-reader user focusing a field is not told it is
required, does not hear its hint, and — when a value is invalid — the field is
not marked invalid, so the only cue is the `role=alert` text firing once when it
appears (missed on later focus). Required asterisks are literally hidden from AT,
so the required/optional distinction is invisible to non-visual users on
high-consequence forms (create lock, register break-glass key, register node).

## Fix

In the `Field`/control primitives, thread ARIA through to the actual control:
`required`/`aria-required={required}` on the input, `aria-invalid={error != null}`
when an error is present, and `aria-describedby` referencing the hint and error
element ids (generate ids alongside the existing `useId()`). Convey the required
marker to AT too (e.g. `<abbr title="required" aria-label="required">*</abbr>` or
visually-hidden "required" text) rather than `aria-hidden`.

## Resolution (Session 19)

Form controls now emit aria-required, aria-invalid, and aria-describedby linking the hint and error (fieldAria() in src/ui/Form.tsx). Regression test: src/ui/Form.test.tsx.
