/**
 * The client-side replay/export pipeline. The Control Plane issues a short-lived
 * signed URL to the still-encrypted object; the browser fetches those bytes
 * DIRECTLY from object storage (not via the API client, so no bearer rides along)
 * and decrypts them locally with the customer key. The platform never sees
 * plaintext and never sees the private key (Design §12.2/§18).
 */

import { api } from '../../api/client';
import { unwrap } from '../../api/problem';
import { idempotencyHeader } from '../../api/idempotency';
import { parseAsciicast, type Asciicast } from '../../crypto/asciicast';
import { unsealRecording } from '../../crypto/slrec';
import type { SignedUrl } from '../../api/types';

/**
 * Fetch the sealed object from the signed URL and check its length against the
 * CP-reported `sizeBytes`. The object comes from a leg OUTSIDE the CP trust
 * boundary (object store / CDN), and the SLREC1 cipher does NOT detect trailing
 * frames being dropped (per-frame AAD catches reorder/interior edits, not tail
 * truncation). This length check — against a value the CP authenticated over the
 * bearer API — fails closed on silent truncation. `expectedSize` is the stored
 * (sealed) object size. Full hash-chain verification is a cross-repo follow-up
 * (needs the Gateway chain algorithm; tracked with the deferred Merkle anchor).
 */
async function fetchObjectBytes(
  signed: SignedUrl,
  expectedSize: number | undefined,
): Promise<Uint8Array> {
  // Plain fetch to the signed object URL — deliberately NOT the api client.
  const resp = await fetch(signed.url, { method: signed.method });
  if (!resp.ok) {
    throw new Error(
      `Could not download the recording object (HTTP ${String(resp.status)}).`,
    );
  }
  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (expectedSize !== undefined && bytes.length !== expectedSize) {
    throw new Error(
      `Recording integrity check failed: object is ${String(bytes.length)} bytes, expected ${String(expectedSize)} (truncated or tampered).`,
    );
  }
  return bytes;
}

/** Replay: sign → download → integrity-check → decrypt → parse to a playable asciicast. */
export async function loadReplayCast(
  recordingId: string,
  key: CryptoKey,
  expectedSize?: number,
): Promise<Asciicast> {
  const signed = unwrap(
    await api.POST('/v1/recordings/{recordingId}/replay', {
      params: { path: { recordingId }, header: idempotencyHeader() },
    }),
  );
  const bytes = await fetchObjectBytes(signed, expectedSize);
  const plaintext = await unsealRecording(bytes, key);
  return parseAsciicast(new TextDecoder().decode(plaintext));
}

/** Export: sign → download → integrity-check → decrypt to the raw asciicast v2 bytes. */
export async function loadExportBytes(
  recordingId: string,
  key: CryptoKey,
  expectedSize?: number,
): Promise<Uint8Array> {
  const signed = unwrap(
    await api.POST('/v1/recordings/{recordingId}/export', {
      params: { path: { recordingId }, header: idempotencyHeader() },
    }),
  );
  const bytes = await fetchObjectBytes(signed, expectedSize);
  return unsealRecording(bytes, key);
}

/** Save decrypted bytes to a local file. The plaintext never leaves the browser. */
export function downloadBytes(bytes: Uint8Array, filename: string): void {
  // The DOM lib types Uint8Array<ArrayBufferLike> as not directly a BlobPart.
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/x-asciicast',
  });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
