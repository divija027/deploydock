'use client';

import { motion } from 'framer-motion';
import {
  Box,
  Activity,
  Network,
  GitBranch,
  LayoutGrid,
  Shield,
} from 'lucide-react';

const features = [
  {
    icon: Box,
    title: 'Container Management',
    description:
      'List, start, stop, restart, and remove containers from a clean web UI. View detailed info including ports, networks, and configuration.',
  },
  {
    icon: Activity,
    title: 'Real-Time Logs & Metrics',
    description:
      'Stream container logs live and monitor CPU, memory, and network I/O with real-time updating charts powered by SSE.',
  },
  {
    icon: Network,
    title: 'Network Topology',
    description:
      'Interactive D3.js force-directed graph visualizing how containers connect to networks. Drag, zoom, and hover for details.',
  },
  {
    icon: GitBranch,
    title: 'Git Auto-Deploy',
    description:
      'Push to GitHub and DeployDock auto-builds and deploys your app — clone, detect language, build image, and run. Like Heroku, on your server.',
  },
  {
    icon: LayoutGrid,
    title: 'One-Click Templates',
    description:
      'Deploy Ghost, Gitea, Redis, PostgreSQL, Nextcloud, and more in seconds with pre-configured ports and environment variables.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description:
      'Three roles — admin, developer, and viewer — with JWT-based authentication control who can deploy, manage, or just observe.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative py-24 px-6 md:px-12 lg:px-20 bg-background font-body overflow-hidden"
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-pattern opacity-60" />

      {/* Subtle gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/[0.03] rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-medium uppercase tracking-widest text-accent mb-4">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground">
            Everything you need to manage{' '}
            <em className="font-display italic">Docker</em>
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-[600px] mx-auto leading-relaxed">
            A complete toolkit for container management, monitoring, deployment,
            and access control — all from your browser.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group relative rounded-xl border border-border bg-background p-6 transition-all duration-300 hover:shadow-lg hover:border-accent/30 hover:-translate-y-0.5"
            >
              {/* Gradient hover glow behind card */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/15 transition-colors duration-300">
                  <feature.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display text-lg text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
