import { describe, expect, it, vi, beforeEach } from 'vitest';

const authMock = vi.fn(async () => null);
vi.mock('@/auth', () => ({ auth: () => authMock() }));

const prismaMock = {
  appConfig: { findUnique: vi.fn(async () => null) },
  deployment: { create: vi.fn(async ({ data }: any) => ({ id: 'dep_2', ...data })) },
};
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

const buildAndDeploy = vi.fn(async () => {});
vi.mock('@/lib/docker/deploy', () => ({ buildAndDeploy }));

describe('POST /api/deployments', () => {
  beforeEach(() => {
    authMock.mockReset();
    prismaMock.appConfig.findUnique.mockReset();
    prismaMock.deployment.create.mockReset();
    buildAndDeploy.mockReset();
  });

  it('forbids unauthenticated', async () => {
    authMock.mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/deployments/route');
    const req = new Request('http://localhost/api/deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'x' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('forbids viewer role', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u1', role: 'viewer' } } as any);
    const { POST } = await import('@/app/api/deployments/route');
    const req = new Request('http://localhost/api/deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'x' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('requires repoUrl configured', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u1', role: 'developer' } } as any);
    prismaMock.appConfig.findUnique.mockResolvedValueOnce({ appName: 'x', repoUrl: null } as any);
    const { POST } = await import('@/app/api/deployments/route');
    const req = new Request('http://localhost/api/deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'x' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates deployment and triggers build for developer', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u1', role: 'developer' } } as any);
    prismaMock.appConfig.findUnique.mockResolvedValueOnce({ appName: 'x', repoUrl: 'https://example.com/x.git' } as any);
    const { POST } = await import('@/app/api/deployments/route');
    const req = new Request('http://localhost/api/deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName: 'x' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deploymentId).toBe('dep_2');
    expect(buildAndDeploy).toHaveBeenCalledTimes(1);
  });
});

