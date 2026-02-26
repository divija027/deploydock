import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import docker from '@/lib/docker/client';

export async function GET() {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const [containers, networks] = await Promise.all([
      docker.listContainers({ all: true }),
      docker.listNetworks()
    ]);

    const nodes = [
      ...containers.map(c => ({
        id: c.Id.slice(0, 12),
        label: c.Names[0]?.replace('/', '') ?? c.Id.slice(0, 8),
        type: 'container' as const,
        state: c.State,
        image: c.Image,
        ports: c.Ports,
      })),
      ...networks
        .filter(n => !['none', 'host'].includes(n.Name))
        .map(n => ({
          id: n.Id.slice(0, 12),
          label: n.Name,
          type: 'network' as const,
          driver: n.Driver,
        }))
    ];

    const links = containers.flatMap(c => {
      const containerNode = nodes.find(n => n.id === c.Id.slice(0, 12));
      if (!containerNode) return [];

      return Object.entries(c.NetworkSettings?.Networks ?? {}).flatMap(([netName, netInfo]) => {
        const netNode = nodes.find(n => n.type === 'network' && n.label === netName);
        if (!netNode) return [];
        return [{
          source: containerNode.id,
          target: netNode.id,
          ip: (netInfo as any).IPAddress,
        }];
      });
    });

    return NextResponse.json({ nodes, links });
  } catch {
    return NextResponse.json({ error: 'Docker unavailable' }, { status: 503 });
  }
}
