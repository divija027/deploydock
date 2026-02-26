'use client';
import { DockIcon as Docker, Network, Rocket, LayoutDashboard, Images, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/network', label: 'Network', icon: Network },
  { href: '/deployments', label: 'Deployments', icon: Rocket },
  { href: '/images', label: 'Images', icon: Images },
  { href: '/templates', label: 'Templates', icon: Docker },
];

export function DashboardHeader() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 mr-6">
          <Docker className="h-6 w-6 text-blue-500" />
          <h1 className="text-xl font-bold hidden sm:block">DeployDock</h1>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant={pathname === href ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-1.5"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {session?.user && (
            <span className="text-sm text-muted-foreground hidden md:inline">
              {session.user.name ?? session.user.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {session && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">Sign out</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
