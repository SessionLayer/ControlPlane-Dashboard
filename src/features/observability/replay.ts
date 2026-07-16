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

async function fetchObjectBytes(signed: SignedUrl): Promise<Uint8Array> {
  // Plain fetch to the signed object URL — deliberately NOT the api client.
  const resp = await fetch(signed.url, { method: signed.method });
  if (!resp.ok) {
    throw new Error(
      `Could not download the recording object (HTTP ${String(resp.status)}).`,
    );
  }
  return new Uint8Array(await resp.arrayBuffer());
}

/** Replay: sign → download → decrypt → parse to a playable asciicast. */
export async function loadReplayCast(
  recordingId: string,
  key: CryptoKey,
): Promise<Asciicast> {
  const signed = unwrap(
    await api.POST('/v1/recordings/{recordingId}/replay', {
      params: { path: { recordingId }, header: idempotencyHeader() },
    }),
  );
  const bytes = await fetchObjectBytes(signed);
  const plaintext = await unsealRecording(bytes, key);
  return parseAsciicast(new TextDecoder().decode(plaintext));
}

/** Export: sign → download → decrypt to the raw asciicast v2 bytes for saving. */
export async function loadExportBytes(
  recordingId: string,
  key: CryptoKey,
): Promise<Uint8Array> {
  const signed = unwrap(
    await api.POST('/v1/recordings/{recordingId}/export', {
      params: { path: { recordingId }, header: idempotencyHeader() },
    }),
  );
  const bytes = await fetchObjectBytes(signed);
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
