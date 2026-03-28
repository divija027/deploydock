'use client';

import {
  Home,
  Box,
  Image,
  Network,
  Rocket,
  LayoutGrid,
  FileText,
  Activity,
  Settings,
  ChevronDown,
  Search,
  Bell,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  Send,
  Download,
  Globe,
  Hammer,
  ScrollText,
} from 'lucide-react';

export function DashboardPreview() {
  return (
    <div
      className="rounded-2xl overflow-hidden p-3 md:p-4"
      style={{
        background: 'rgba(255, 255, 255, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: 'var(--shadow-dashboard)',
      }}
    >
      <div className="rounded-xl bg-background overflow-hidden select-none pointer-events-none text-[11px]">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-foreground flex items-center justify-center text-[9px] font-bold text-background">
              D
            </div>
            <span className="font-semibold text-foreground text-xs">DeployDock</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="hidden md:flex items-center gap-1.5 bg-secondary rounded-md px-2.5 py-1 text-muted-foreground flex-1 max-w-[240px] mx-4">
            <Search className="h-3 w-3" />
            <span className="flex-1">Search...</span>
            <kbd className="text-[9px] bg-background rounded px-1 py-0.5 border border-border">⌘K</kbd>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-accent text-accent-foreground rounded-md px-2 py-1 text-[10px] font-medium">
              <Rocket className="h-3 w-3" />
              Deploy
            </div>
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="h-5 w-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[9px] font-semibold">
              JB
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden md:flex flex-col w-40 border-r border-border py-2 px-2 gap-0.5 shrink-0">
            <SidebarItem icon={Home} label="Home" active />
            <SidebarItem icon={Box} label="Containers" badge="12" />
            <SidebarItem icon={Image} label="Images" />
            <SidebarItem icon={Network} label="Networks" />
            <SidebarItem icon={Rocket} label="Deployments" chevron />
            <SidebarItem icon={LayoutGrid} label="Templates" />

            <div className="mt-3 mb-1 px-2 text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
              System
            </div>
            <SidebarItem icon={FileText} label="Logs" />
            <SidebarItem icon={Activity} label="Metrics" />
            <SidebarItem icon={Settings} label="Settings" />
          </div>

          {/* Main Content */}
          <div className="flex-1 p-3 bg-secondary/30 min-w-0">
            {/* Greeting */}
            <div className="text-sm font-semibold text-foreground mb-3">Welcome, Jane</div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 mb-3 overflow-hidden">
              <ActionPill icon={Send} label="Deploy" primary />
              <ActionPill icon={Download} label="Pull Image" />
              <ActionPill icon={Globe} label="Create Network" />
              <ActionPill icon={Hammer} label="Build" />
              <ActionPill icon={ScrollText} label="View Logs" />
              <ActionPill icon={LayoutGrid} label="Templates" />
              <span className="text-[9px] text-accent font-medium ml-1 hidden sm:inline">Customize</span>
            </div>

            {/* Cards Row */}
            <div className="flex gap-2.5 mb-2.5">
              {/* Resource Overview Card */}
              <div className="flex-1 basis-0 bg-background rounded-lg p-2.5 border border-border min-w-0">
                <div className="flex items-center gap-1 mb-2">
                  <span className="font-semibold text-foreground">Cluster Resources</span>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                </div>
                <div className="flex items-center gap-3 mb-1.5 text-[10px]">
                  <span className="text-foreground font-semibold">12 Running</span>
                  <span className="text-muted-foreground">3 Stopped</span>
                </div>
                <div className="flex items-center gap-3 mb-2 text-[10px]">
                  <span className="text-green-600">CPU 67%</span>
                  <span className="text-red-500">RAM 4.2GB</span>
                </div>
                {/* SVG Area Chart */}
                <svg viewBox="0 0 200 60" className="w-full h-14" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(239 84% 67%)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="hsl(239 84% 67%)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,45 C20,42 35,30 50,28 C65,26 75,35 90,32 C105,29 115,18 130,15 C145,12 155,20 170,18 C185,16 195,10 200,8 L200,60 L0,60 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M0,45 C20,42 35,30 50,28 C65,26 75,35 90,32 C105,29 115,18 130,15 C145,12 155,20 170,18 C185,16 195,10 200,8"
                    fill="none"
                    stroke="hsl(239 84% 67%)"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>

              {/* Running Containers Card */}
              <div className="flex-1 basis-0 bg-background rounded-lg p-2.5 border border-border min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Running Containers</span>
                  <div className="flex items-center gap-1">
                    <Plus className="h-3 w-3 text-muted-foreground" />
                    <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                <ContainerRow name="nginx:alpine" port="8080" />
                <ContainerRow name="redis:7" port="6379" />
                <ContainerRow name="postgres:16" port="5432" />
              </div>
            </div>

            {/* Deployments Table */}
            <div className="bg-background rounded-lg p-2.5 border border-border">
              <div className="font-semibold text-foreground mb-2">Recent Deployments</div>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="font-medium pb-1.5">App</th>
                    <th className="font-medium pb-1.5">Commit</th>
                    <th className="font-medium pb-1.5">Status</th>
                    <th className="font-medium pb-1.5 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  <DeployRow app="api-server" commit="abc1234" status="Live" time="2m ago" />
                  <DeployRow app="web-app" commit="def5678" status="Building" time="5m ago" pending />
                  <DeployRow app="worker" commit="789abc0" status="Live" time="1h ago" />
                  <DeployRow app="docs" commit="cde0123" status="Live" time="3h ago" />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function SidebarItem({
  icon: Icon,
  label,
  active,
  badge,
  chevron,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: string;
  chevron?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
        active
          ? 'bg-secondary text-foreground font-medium'
          : 'text-muted-foreground hover:bg-secondary/50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="bg-accent text-accent-foreground text-[9px] rounded-full px-1.5 py-0.5 font-medium leading-none">
          {badge}
        </span>
      )}
      {chevron && <ChevronDown className="h-3 w-3" />}
    </div>
  );
}

function ActionPill({
  icon: Icon,
  label,
  primary,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${
        primary
          ? 'bg-accent text-accent-foreground'
          : 'bg-background border border-border text-foreground'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

function ContainerRow({ name, port }: { name: string; port: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-[10px]">
      <div className="flex items-center gap-2 min-w-0">
        <Box className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-foreground font-medium truncate">{name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted-foreground">:{port}</span>
        <span className="inline-flex items-center gap-1 text-green-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Running
        </span>
      </div>
    </div>
  );
}

function DeployRow({
  app,
  commit,
  status,
  time,
  pending,
}: {
  app: string;
  commit: string;
  status: string;
  time: string;
  pending?: boolean;
}) {
  return (
    <tr>
      <td className="py-1.5 font-medium">{app}</td>
      <td className="py-1.5 text-muted-foreground font-mono">{commit}</td>
      <td className="py-1.5">
        <span
          className={`inline-flex items-center gap-1 ${
            pending ? 'text-amber-500' : 'text-green-600'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              pending ? 'bg-amber-400' : 'bg-green-500'
            }`}
          />
          {status}
        </span>
      </td>
      <td className="py-1.5 text-muted-foreground text-right">{time}</td>
    </tr>
  );
}
