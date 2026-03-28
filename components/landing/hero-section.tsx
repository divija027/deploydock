'use client';

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardPreview } from './dashboard-preview';
import Link from 'next/link';

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

export function HeroSection() {
  return (
    <section className="flex-1 relative flex flex-col items-center">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        preload="auto"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4"
          type="video/mp4"
        />
      </video>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center w-full pt-6 lg:pt-8 px-4">
        {/* Badge */}
        <motion.div {...fadeUp(0)}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground font-body mb-3 lg:mb-4">
            Open source &amp; self-hosted ✨
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.1)}
          className="text-center font-display text-4xl md:text-5xl lg:text-6xl leading-[0.95] tracking-tight text-foreground max-w-xl"
        >
          The Future of{' '}
          <em className="font-display italic">Smarter</em>{' '}
          Deployments
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          {...fadeUp(0.2)}
          className="mt-2 lg:mt-3 text-center text-sm md:text-base lg:text-lg text-muted-foreground max-w-[600px] leading-relaxed font-body"
        >
          Manage Docker containers with a beautiful web dashboard — live logs,
          real-time metrics, git-push deploys, and one-click templates on your
          own server.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div {...fadeUp(0.3)} className="mt-3 lg:mt-4 flex items-center gap-3">
          <Link href="/dashboard">
            <Button className="rounded-full px-5 py-4 text-sm font-medium font-body">
              Get Started
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full border-0 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-background/80"
            size="icon"
          >
            <Play className="h-4 w-4 fill-foreground" />
          </Button>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-5 lg:mt-6 w-full max-w-5xl"
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}
