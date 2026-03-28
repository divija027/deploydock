import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'DeployDock - Self-Hosted Docker Management, Simplified',
  description:
    'Deploy like Heroku, control like Docker. A beautiful web dashboard for managing containers, live logs, metrics, and git-push deployments on your own server.',
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`landing-theme ${inter.variable} ${instrumentSerif.variable} bg-background text-foreground`}
    >
      {children}
    </div>
  );
}
