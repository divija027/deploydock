'use client';

import { motion } from 'framer-motion';

const techStack = [
  'Next.js 15',
  'React 19',
  'TypeScript',
  'Tailwind CSS',
  'Docker',
  'Prisma',
  'D3.js',
  'SSE',
  'NextAuth.js',
  'SQLite',
  'Recharts',
  'Shadcn/ui',
];

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative py-24 px-6 md:px-12 lg:px-20 bg-secondary/40 font-body overflow-hidden"
    >
      {/* Decorative blobs */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/[0.04] rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent/[0.03] rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-xs font-medium uppercase tracking-widest text-accent mb-4">
              About
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground mb-6">
              About <em className="font-display italic">DeployDock</em>
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Docker is powerful, but managing containers through the CLI is
                tedious and error-prone. There is no single view of what is
                running, no built-in web UI, and no CI/CD out of the box.
                Managed platforms like Heroku solve this but charge per-app
                monthly fees.
              </p>
              <p>
                DeployDock bridges that gap. It is a self-hosted, open-source
                Docker PaaS dashboard that gives you a beautiful web interface
                for managing containers, streaming logs, monitoring resources,
                and deploying apps via Git push — all on your own server, free
                forever.
              </p>
              <p>
                Built as both a production-ready tool and an educational
                project, DeployDock demonstrates core computer science concepts
                including OS process lifecycle, real-time streaming, network
                topology visualization, CI/CD pipelines, and role-based access
                control.
              </p>
            </div>
          </motion.div>

          {/* Right — tech stack */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <h3 className="font-display text-xl text-foreground mb-5">
              Built with modern technologies
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {techStack.map((tech, i) => (
                <motion.span
                  key={tech}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.04 }}
                  className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:border-accent/40 hover:shadow-md transition-all duration-200"
                >
                  {tech}
                </motion.span>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { value: '9+', label: 'Core Features' },
                { value: '8', label: 'App Templates' },
                { value: '3', label: 'User Roles' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                  className="text-center rounded-lg border border-border bg-background p-4"
                >
                  <div className="font-display text-2xl text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
