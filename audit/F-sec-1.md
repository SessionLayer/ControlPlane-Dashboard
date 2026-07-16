# F-sec-1: Recording replay/export never verifies the object against the CP-authenticated tamper-evidence anchor (silent tail-truncation)

- Severity: medium
- Status: Verified-Fixed
- Area: sec

## Issue

The replay/export pipeline downloads the sealed recording from an out-of-band,
un-authenticated signed URL and decrypts it, but never cross-checks the bytes
against the tamper-evidence metadata the Control Plane returns over the
authenticated (bearer) API channel.

`SignedUrl` is documented as _"Bytes never proxy through the CP"_
(`src/api/schema.d.ts:2652`) and `replay.ts` fetches it with a bare
`fetch(signed.url, ...)` deliberately outside the API client
(`src/features/observability/replay.ts:16-25`, `28-54`). So the recording bytes
arrive from a component (object store / its TLS + signing endpoint) that sits
_outside_ the CP trust boundary — the same boundary that (by design) the
platform cannot decrypt across.

`unsealRecording` then iterates frames until end-of-buffer with no total count
or terminator (`src/crypto/slrec.ts:263-312`). Per-frame confidentiality and
ordering are protected (nonce + frame-index AAD → a reordered or interior-deleted
frame fails the GCM tag), **but removing whole trailing frames is undetected**:
the remaining frames `0..k` still decrypt with correct index/AAD and the loop
simply stops at `atEnd()`. The doc comment claims otherwise —
_"A tampered/reordered/truncated object fails the GCM tag ... decryption is
itself tamper-evidence"_ (`slrec.ts:259-262`, echoed at `301`) — which is false
for tail truncation.

Crucially, the CP already hands the client the anchors that would catch this and
they are read but never used for verification:

- `RecordingResource.hashChainHead` — explicitly _"The tamper-evidence hash-chain
  head (hex)"_ (`src/api/schema.d.ts:2617-2618`) — is only _displayed_
  (`src/features/observability/RecordingDetails.tsx:140-146`).
- `RecordingResource.sizeBytes` (`schema.d.ts:2615-2616`) — likewise only
  displayed (`RecordingDetails.tsx:115`).

`loadReplayCast`/`loadExportBytes` receive only `recordingId`+`key`
(`replay.ts:28`, `43`) and never see this metadata, so no length or digest check
is possible as written.

## Impact

An adversary who controls the bytes returned by the signed object URL (a breached
or malicious object store, a compromised signing/CDN edge in front of it, or a
TLS MitM on the object-store leg — all in scope: "may control upstream responses
if they breach a backend") can silently truncate a recording — e.g. cut the tail
where an attacker's actions were captured — and the operator replays/exports a
cleanly-decrypting recording with **no error and no integrity warning**, while the
UI presents a `hashChainHead` that was never checked. For a Zero-Trust platform
whose recordings are marketed as tamper-evident forensic evidence and whose object
store is explicitly outside the decryption trust boundary, the browser is the last
verification line, and it performs none. WORM protects bytes _at rest_ but not the
fetch/serve path, so it does not cover this.

## Fix

Thread the recording metadata into the load functions and verify before trusting
the decrypted result; fail closed (throw an `SlrecError`-style integrity error the
dialogs already surface):

1. Cheap immediate mitigation: pass `recording.sizeBytes` into
   `loadReplayCast`/`loadExportBytes` and assert the fetched object length
   (`bytes.length`) equals it; a mismatch is an integrity failure, not a silent
   short read. This catches tail-truncation and padding.
2. Full fix: verify `recording.hashChainHead` by recomputing the S9 hash-chain
   over the sealed frames client-side (the chain that makes the object
   "self-verifiable"). This requires the Gateway's exact chain algorithm
   (`gateway-core` seal path) — a cross-repo follow-up; track alongside the
   deferred Merkle-anchor work (FR-AUD-10/D34).
3. Correct the overclaim in `slrec.ts:259-262`/`301`: decryption alone is NOT
   tamper-evidence against trailing truncation; do not tell the operator it is.

## Resolution (Session 19)

Replay/export now fetch the sealed object with a fail-closed length integrity check against the CP-reported sizeBytes (loadReplayCast/loadExportBytes/fetchObjectBytes in src/features/observability/replay.ts), closing the silent tail-truncation gap on the object-store leg; the misleading slrec.ts tamper-evidence comment was corrected. Regression test in replay.test.tsx (fails closed on a dropped trailing frame). ACCEPTED RESIDUAL: full hash-chain verification against hashChainHead needs the Gateway chain algorithm (cross-repo, out of this UI-only session; tracked with the deferred Merkle anchor D34/FR-AUD-10) and is recommended for session twenty. The length check fully closes the exploitable silent-truncation gap this session could reach.
