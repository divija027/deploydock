import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma and deployer
vi.mock('@/lib/prisma', () => ({
  prisma: {
    deployment: {
      create: vi.fn(async ({ data }: any) => ({ id: 'dep_1', ...data })),
    },
  },
}));

const buildAndDeploy = vi.fn(async () => {});
vi.mock('@/lib/docker/deploy', () => ({ buildAndDeploy }));

describe('POST /api/webhooks/deploy', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('returns 500 if WEBHOOK_SECRET missing', async () => {
    delete process.env.WEBHOOK_SECRET;
    const { POST } = await import('@/app/api/webhooks/deploy/route');
    const req = new Request('http://localhost/api/webhooks/deploy', {
      method: 'POST',
      headers: {
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=deadbeef',
      },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 401 on invalid signature', async () => {
    process.env.WEBHOOK_SECRET = 'secret';
    const { POST } = await import('@/app/api/webhooks/deploy/route');
    const payload = {
      ref: 'refs/heads/main',
      after: 'abcdef0123456789',
      pusher: { name: 'x' },
      repository: { default_branch: 'main', clone_url: 'https://example.com/repo.git', name: 'repo' },
    };
    const req = new Request('http://localhost/api/webhooks/deploy', {
      method: 'POST',
      headers: {
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=deadbeef',
      },
      body: JSON.stringify(payload),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('creates deployment and triggers build on valid push', async () => {
    // Use real signature validator from auth-utils.
    const crypto = await import('crypto');

    process.env.WEBHOOK_SECRET = 'secret';
    const { POST } = await import('@/app/api/webhooks/deploy/route');
    const payload = {
      ref: 'refs/heads/main',
      after: 'abcdef0123456789',
      pusher: { name: 'alice' },
      repository: { default_branch: 'main', clone_url: 'https://example.com/repo.git', name: 'myapp' },
    };
    const body = JSON.stringify(payload);
    const digest = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET).update(body).digest('hex');
    const sig = `sha256=${digest}`;

    const req = new Request('http://localhost/api/webhooks/deploy', {
      method: 'POST',
      headers: {
        'x-github-event': 'push',
        'x-hub-signature-256': sig,
      },
      body,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deploymentId).toBe('dep_1');
    expect(buildAndDeploy).toHaveBeenCalledTimes(1);
    expect(buildAndDeploy.mock.calls[0][0]).toMatchObject({
      appName: 'myapp',
      repoUrl: 'https://example.com/repo.git',
      deploymentId: 'dep_1',
    });
  });
});

