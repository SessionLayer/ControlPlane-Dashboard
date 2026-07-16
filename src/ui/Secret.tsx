import { useState } from 'react';

import { Button } from './Button';

/**
 * A copy-to-clipboard control. Uses the async Clipboard API when available and
 * degrades silently otherwise (no throw on a denied permission). Shows a brief
 * "Copied" confirmation via React state — the value is never logged.
 */
export function CopyButton({
  value,
  label = 'Copy',
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    // `navigator.clipboard` is absent in insecure contexts; the DOM lib types it
    // as always-present, so probe through a nullable view.
    const clip = (navigator as { clipboard?: Clipboard }).clipboard;
    if (clip === undefined) return;
    void clip
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 1500);
      })
      .catch(() => {
        /* clipboard denied — leave the value visible for manual copy */
      });
  };
  return (
    <Button size="sm" variant="ghost" onClick={onCopy} aria-live="polite">
      {copied ? 'Copied' : label}
    </Button>
  );
}

/**
 * Displays a one-time secret (issued OTP, join token, service-account credential,
 * offline codes) that the API returns exactly once. Rendered monospace with a
 * copy control and a "shown once" warning; the caller holds it only in component
 * state and never persists it.
 */
export function SecretReveal({
  value,
  caption = 'Copy this now — it is shown once and cannot be retrieved again.',
}: {
  value: string;
  caption?: string;
}) {
  return (
    <div className="secret-reveal">
      <code className="secret-value">{value}</code>
      <CopyButton value={value} />
      <p className="muted secret-caption">{caption}</p>
    </div>
  );
}
