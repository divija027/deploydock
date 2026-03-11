import { describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { hasRole, verifyGitHubSignature } from '@/lib/auth-utils';

describe('auth-utils', () => {
  it('hasRole orders viewer < developer < admin', () => {
    const viewer = { user: { role: 'viewer' } } as any;
    const dev = { user: { role: 'developer' } } as any;
    const admin = { user: { role: 'admin' } } as any;

    expect(hasRole(viewer, 'viewer')).toBe(true);
    expect(hasRole(viewer, 'developer')).toBe(false);
    expect(hasRole(dev, 'developer')).toBe(true);
    expect(hasRole(dev, 'admin')).toBe(false);
    expect(hasRole(admin, 'admin')).toBe(true);
  });

  it('verifyGitHubSignature validates sha256 HMAC', () => {
    const secret = 's3cr3t';
    const body = JSON.stringify({ hello: 'world' });
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const sig = `sha256=${digest}`;

    expect(verifyGitHubSignature(sig, body, secret)).toBe(true);
    expect(verifyGitHubSignature(sig, body, 'wrong')).toBe(false);
    expect(verifyGitHubSignature(null, body, secret)).toBe(false);
  });
});

