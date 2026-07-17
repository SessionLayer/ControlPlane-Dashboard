import { describe, expect, it } from 'vitest';

import { insecureProdBaseError, isLocalhostBase } from './prodBaseUrl';

describe('production Control Plane base-URL guard', () => {
  it('exempts the loopback dev defaults', () => {
    expect(isLocalhostBase('http://localhost:8080')).toBe(true);
    expect(isLocalhostBase('http://127.0.0.1:8080')).toBe(true);
    expect(insecureProdBaseError('http://localhost:8080')).toBeUndefined();
    expect(insecureProdBaseError('http://127.0.0.1:8080')).toBeUndefined();
  });

  it('allows an https non-localhost base', () => {
    expect(
      insecureProdBaseError('https://controlplane.example'),
    ).toBeUndefined();
  });

  it('allows an empty base (falls back to the localhost default)', () => {
    expect(insecureProdBaseError('')).toBeUndefined();
  });

  it('REJECTS a cleartext non-localhost base (the bearer would ride http)', () => {
    const err = insecureProdBaseError('http://controlplane.example');
    expect(err).toContain('https://');
    expect(err).toContain('controlplane.example');
  });

  it('rejects a non-https scheme to a remote host', () => {
    expect(insecureProdBaseError('ws://controlplane.example')).toContain(
      'https://',
    );
  });
});
