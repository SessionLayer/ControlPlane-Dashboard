# F-rel-2: Global query `retry: 1` retries non-retryable 4xx (401/403/404/409), amplifying the token-expiry burst and delaying error surfacing

- Severity: low
- Status: Verified-Fixed
- Area: rel

## Issue

`src/main.tsx:10-18` sets a blanket `retry: 1` for all queries:

```ts
queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false }
```

React Query applies this to every failed query regardless of status code, so a
`401`, `403`, `404`, `409`, or `422` is retried once before it settles into the
error state. None of those are transient — retrying them cannot succeed.

## Impact

- **Token expiry amplification.** When the in-memory bearer expires, every mounted
  query 401s. The Overview alone fires ~8 concurrent queries (six in
  `features/overview/queries.ts` plus `healthz`/`version`). With `retry: 1` each is
  re-issued once → ~16 requests and ~16 passes through the `onResponse` 401 hook
  (`src/api/client.ts:55-60`), each calling `notifyUnauthorized()` → `clearBearer()`
  before `AuthedLayout` redirects to `/login`. It is bounded (no loop, verified),
  but it is a needless doubled burst at exactly the moment the CP may be under
  auth pressure.
- **Slower error/403 UX.** A forbidden screen (`403`) or a `404` takes two
  round-trips before `ProblemAlert` renders, doubling time-to-error for the
  operator.

## Fix

Gate retries on the status carried by `ProblemError` (already exposed via
`error.status`), retrying only network/5xx:

```ts
retry: (count, err) => {
  const s = err instanceof ProblemError ? err.status : undefined;
  if (s !== undefined && s >= 400 && s < 500) return false;
  return count < 1;
},
```

Mutations are unaffected (they default to `retry: 0`; the config only sets
`queries`), so this does not change write behavior.

## Resolution (Session 19)

Query retry now skips non-retryable 4xx (checks ProblemError.status in the retry predicate) so a token-expiry burst is not doubled and 4xx surface on the first round-trip (src/main.tsx).
