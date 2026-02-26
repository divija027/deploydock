export interface ContainerSummary {
  Id: string;
  Names: string[];
  Image: string;
  State: 'created' | 'restarting' | 'running' | 'removing' | 'paused' | 'exited' | 'dead';
  Status: string;
  Ports: Array<{ IP?: string; PrivatePort: number; PublicPort?: number; Type: string }>;
  Created: number;
  NetworkSettings: {
    Networks: Record<string, { IPAddress: string; NetworkID: string }>;
  };
}

export interface ImageSummary {
  Id: string;
  RepoTags: string[];
  Size: number;
  Created: number;
}

export interface ContainerStats {
  cpuPercent: number;
  memUsage: number;
  memLimit: number;
  netRx: number;
  netTx: number;
}

export type ContainerAction = 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill';

export interface NetworkNode {
  id: string;
  label: string;
  type: 'container' | 'network';
  state?: string;
  driver?: string;
  image?: string;
  ports?: Array<{ PublicPort?: number; PrivatePort: number }>;
}

export interface NetworkLink {
  source: string;
  target: string;
  ip?: string;
}

export interface TopologyData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}
