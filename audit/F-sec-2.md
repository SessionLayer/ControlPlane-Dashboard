# F-sec-2: OIDC `nonce` is generated and sent but never validated on the ID token

- Severity: low
- Status: Verified-Fixed
- Area: sec

## Issue

The login flow mints a `nonce`, stores it in the PKCE transient, and includes it
in the authorize request (`src/auth/oidc.ts:48-54`, `72-86`), but the callback
never checks the returned ID token's `nonce` claim against `transient.nonce`.
`completeCallback` validates `state` (good) and exchanges the code, then sets the
bearer without inspecting `nonce` (`src/auth/AuthContext.tsx:81-100`); `decodeClaims`
does not read `nonce` either (`src/auth/claims.ts:38-73`).

## Impact

Low, given the surrounding controls: this is auth-code + PKCE where the SPA fetches
the token directly from the IdP token endpoint over TLS with its own
`code_verifier`, and `state` is already validated — so there is no front-channel
injection point for a foreign ID token, and PKCE binds the code. The `nonce` check
is the OIDC-BCP belt-and-suspenders against ID-token replay/substitution; omitting
it is a deviation from the spec more than an exploitable hole here. Note it is also
only meaningful together with signature verification, which is intentionally not
done client-side (CP is authoritative) — so this is informational hardening.

## Fix

Either (a) decode the ID token in `completeCallback` and reject when its `nonce`
claim does not equal `transient.nonce` before calling `setBearer`, or (b) drop the
unused `nonce` generation and document that CP-side ID-token validation is the sole
gate. Prefer (a) for defense-in-depth; keep it cheap (claim compare only, no
signature check).

## Resolution (Session 19)

completeCallback now validates the ID-token nonce claim against the request nonce (validate-if-present, preserving the access-token fallback) in src/auth/AuthContext.tsx (+ nonce in claims.ts). Regression tests in AuthContext.test.tsx.
