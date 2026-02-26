# Network Topology Visualization (D3.js)

## What It Shows

An interactive force-directed graph showing:
- **Nodes**: containers (circles) and Docker networks (hexagons/diamonds)
- **Links**: which containers are connected to which networks
- **Labels**: container name, network name, IP addresses on links
- **Colors**: running=green, stopped=red, paused=yellow; network=purple
- **Interaction**: drag nodes to reposition, hover for details tooltip

---

## Install

```bash
pnpm add d3 @types/d3
```

---

## Data Shape (from `/api/docker/networks`)

```typescript
interface NetworkNode {
  id: string;         // short container/network ID
  label: string;      // display name
  type: 'container' | 'network';
  state?: string;     // container: 'running' | 'exited' | ...
  driver?: string;    // network: 'bridge' | 'overlay' | ...
  image?: string;
  ports?: Array<{ PublicPort?: number; PrivatePort: number }>;
}

interface NetworkLink {
  source: string;     // node id
  target: string;     // node id
  ip?: string;        // container's IP in that network
}

interface TopologyData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}
```

---

## Full Component

**`components/network-graph.tsx`**

```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { NetworkNode, NetworkLink, TopologyData } from '@/types/docker';

const WIDTH = 800;
const HEIGHT = 500;

// Colors per container state
const stateColor: Record<string, string> = {
  running: '#22c55e',   // green-500
  exited: '#ef4444',    // red-500
  paused: '#eab308',    // yellow-500
  created: '#94a3b8',   // slate-400
  dead: '#991b1b',      // red-800
};

export function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch topology data
  useEffect(() => {
    fetch('/api/docker/networks')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Build D3 graph whenever data changes
  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear previous render

    // Deep copy nodes/links so D3 can mutate positions
    const nodes: (NetworkNode & d3.SimulationNodeDatum)[] = data.nodes.map(n => ({ ...n }));
    const links: (NetworkLink & d3.SimulationLinkDatum<any>)[] = data.links.map(l => ({ ...l }));

    // ── Zoom & Pan ──────────────────────────────────────────────
    const g = svg.append('g'); // main group (zoom applies here)
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // ── Arrow marker for directed links ─────────────────────────
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#64748b');

    // ── Links ───────────────────────────────────────────────────
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#475569')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,3')
      .attr('marker-end', 'url(#arrow)');

    // Link IP labels
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links.filter(l => l.ip))
      .join('text')
      .attr('font-size', 9)
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle')
      .text(l => l.ip ?? '');

    // ── Nodes ───────────────────────────────────────────────────
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(
        d3.drag<SVGGElement, any>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null; // unpin after drag
          })
      );

    // Container nodes → filled circle
    node.filter(d => d.type === 'container')
      .append('circle')
      .attr('r', 16)
      .attr('fill', d => stateColor[d.state ?? 'created'] ?? '#94a3b8')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2);

    // Network nodes → diamond shape
    node.filter(d => d.type === 'network')
      .append('polygon')
      .attr('points', '0,-20 20,0 0,20 -20,0') // diamond
      .attr('fill', '#7c3aed')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2);

    // Labels
    node.append('text')
      .attr('dy', d => d.type === 'container' ? 28 : 32)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#e2e8f0')
      .text(d => d.label.length > 14 ? d.label.slice(0, 12) + '…' : d.label);

    // ── Tooltip ─────────────────────────────────────────────────
    const tooltip = d3.select('body').append('div')
      .attr('class', 'fixed z-50 bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg pointer-events-none opacity-0 transition-opacity')
      .style('max-width', '200px');

    node
      .on('mouseenter', (event, d) => {
        const lines = d.type === 'container'
          ? [`🐳 ${d.label}`, `State: ${d.state}`, `Image: ${d.image}`,
             d.ports?.map(p => p.PublicPort ? `${p.PublicPort}→${p.PrivatePort}` : `${p.PrivatePort}`).join(', ') ?? ''].filter(Boolean)
          : [`🌐 ${d.label}`, `Driver: ${d.driver}`];

        tooltip
          .html(lines.join('<br>'))
          .style('left', `${event.pageX + 12}px`)
          .style('top', `${event.pageY - 10}px`)
          .style('opacity', '1');
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'));

    // ── Force Simulation ─────────────────────────────────────────
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(130).strength(0.7))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2))
      .force('collide', d3.forceCollide().radius(35))
      .on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        linkLabel
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

    // Cleanup
    return () => {
      sim.stop();
      tooltip.remove();
    };
  }, [data]);

  if (loading) return <div className="h-[500px] flex items-center justify-center text-muted-foreground">Loading network topology...</div>;
  if (!data?.nodes.length) return <div className="h-[500px] flex items-center justify-center text-muted-foreground">No containers or networks found</div>;

  return (
    <div className="relative border rounded-lg overflow-hidden bg-slate-950">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 text-xs text-slate-300">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Running</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Stopped</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rotate-45 bg-violet-600 inline-block" /> Network</div>
      </div>

      {/* Refresh button */}
      <button
        onClick={() => fetch('/api/docker/networks').then(r => r.json()).then(setData)}
        className="absolute top-3 right-3 z-10 text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700"
      >
        Refresh
      </button>

      <svg ref={svgRef} width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />
    </div>
  );
}
```

---

## Page Integration

**`app/network/page.tsx`**
```typescript
import { NetworkGraph } from '@/components/network-graph';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function NetworkPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Container Network</h1>
        <p className="text-muted-foreground text-sm">
          Interactive graph of container-to-network connections. Drag nodes to rearrange.
        </p>
      </div>
      <NetworkGraph />
    </div>
  );
}
```

---

## Key D3 Concepts (for report/viva)

| Concept | Implementation |
|---------|---------------|
| **Force simulation** | `d3.forceSimulation` applies physics — charge (repel), link (attract), center (gravity), collide (no overlap) |
| **Alpha cooling** | Simulation "heats up" on drag (alphaTarget 0.3), cools to 0 at rest — prevents infinite jiggling |
| **Data join** | `.selectAll().data().join()` — D3's update pattern, creates/updates/removes SVG elements to match data |
| **Zoom behavior** | `d3.zoom()` applies `transform` attribute to the `<g>` group, enabling pan+zoom without re-rendering |
| **Drag behavior** | `fx`/`fy` = fixed position during drag; set to null on end to release to simulation |
