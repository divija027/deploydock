'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20);
  });

  return (
    <motion.nav
      className={`sticky top-0 z-40 flex items-center justify-between px-6 md:px-12 lg:px-20 py-4 font-body transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-lg shadow-sm border-b border-border/50'
          : 'bg-transparent'
      }`}
    >
      <Link href="/" className="text-xl font-semibold tracking-tight text-foreground">
        ✦ DeployDock
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Features
        </a>
        <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          About
        </a>
        <a href="#team" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Team
        </a>
        <a
          href="https://github.com/divija027/deploydock"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </div>

      <Link href="/dashboard">
        <Button className="rounded-full px-5 text-sm font-medium">
          Get Started
        </Button>
      </Link>
    </motion.nav>
  );
}
