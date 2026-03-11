import { describe, expect, it, vi, beforeEach } from 'vitest';

const authMock = vi.fn(async () => null);
vi.mock('@/auth', () => ({ auth: () => authMock() }));

const dockerMock = { getEvents: vi.fn(async () => { throw new Error('nope'); }) };
vi.mock('@/lib/docker/client', () => ({ default: dockerMock }));

describe('GET /api/docker/events', () => {
  beforeEach(() => {
    authMock.mockReset();
    dockerMock.getEvents.mockReset();
  });

  it('401 when not authenticated', async () => {
    authMock.mockResolvedValueOnce(null);
    const { GET } = await import('@/app/api/docker/events/route');
    const res = await GET(new Request('http://localhost/api/docker/events'));
    expect(res.status).toBe(401);
  });

  it('503 when docker unavailable', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u1' } } as any);
    dockerMock.getEvents.mockRejectedValueOnce(new Error('down'));
    const { GET } = await import('@/app/api/docker/events/route');
    const res = await GET(new Request('http://localhost/api/docker/events'));
    expect(res.status).toBe(503);
  });

  it('returns SSE headers when available', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u1' } } as any);
    // Minimal fake readable stream with .on()
    dockerMock.getEvents.mockResolvedValueOnce({
      on: () => {},
    } as any);

    const { GET } = await import('@/app/api/docker/events/route');
    const res = await GET(new Request('http://localhost/api/docker/events'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });
});

