# F-rel-3: Idempotency-Key is regenerated per attempt, so a manual retry of a dropped POST creates a duplicate resource

- Severity: low
- Status: Verified-Fixed
- Area: rel

## Issue

`idempotencyHeader()` defaults its key to a fresh `crypto.randomUUID()` on every
call (`src/api/idempotency.ts:7-16`), and every create hook calls it _inside_ the
`mutationFn`, e.g.:

```ts
mutationFn: async (body) =>
  unwrap(await api.POST('/v1/rules', { body, params: { header: idempotencyHeader() } })),
```

(`src/features/access/hooks.ts:44-48`; same shape in `policies/hooks.ts`,
`fleet/api.ts`, `observability/recordingHooks.ts`). So each `mutate()` invocation
mints a **new** key.

## Impact

The Idempotency-Key exists precisely so the Control Plane can dedupe a POST that
was retried after its response was lost (Design §13). Here, the two attempts of the
_same logical action_ carry different keys, so the CP sees two distinct requests
and creates two resources.

Exposure is narrow — mutations don't auto-retry (`retry: 0`), and the submit
buttons disable while `isPending` — so the only trigger is: submit → the server
creates the resource but the **response** is dropped (network blip / gateway
timeout) → the mutation errors → the operator clicks submit again → duplicate
rule / role / node / lock / pin / join-token. It is low-frequency but it silently
defeats the one mechanism meant to prevent it, on create paths where duplicates
matter (e.g. duplicate CAs, duplicate service accounts).

## Fix

Make the key stable for the lifetime of a form/dialog instance and reuse it across
retries of that action, e.g. in each create dialog:

```ts
const idemKey = useRef(newIdempotencyKey());
// ...
params: {
  header: idempotencyHeader(idemKey.current);
}
```

`idempotencyHeader` already accepts an explicit key, so this is a per-call-site
change with no API surface change. (Reset the ref only when the dialog is
re-opened for a genuinely new action.)

## Resolution (Session 19)

Introduced src/api/useIdempotencyKey.ts (ref-backed key, stable across manual retries, reset on success) and applied it to every create/rotate hook in access/hooks.ts and policies/hooks.ts. Action endpoints (terminate/replay/export/legal-hold) intentionally keep per-call keys as they are idempotent. (Applied by teammates b1-access, b2-policies.)
