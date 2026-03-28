import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative py-10 px-6 md:px-12 lg:px-20 bg-foreground font-body overflow-hidden">
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="relative max-w-6xl mx-auto">
        {/* Main footer content */}
        <div className="flex flex-col items-center text-center gap-5">
          {/* Logo */}
          <span className="text-lg font-semibold tracking-tight text-background">
            ✦ DeployDock
          </span>

          {/* Built with love */}
          <p className="text-sm text-background/50">
            Built with{' '}
            <span className="inline-block animate-pulse text-red-400">&#9829;</span>
            {' '}by Aatmasree, Divija &amp; Jagrathi
          </p>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-background/40">
            <a
              href="https://github.com/divija027/deploydock"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-background/70 transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <span className="h-3 w-px bg-background/20" />
            <span>&copy; {new Date().getFullYear()} DeployDock</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
