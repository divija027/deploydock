import { LandingNavbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { AboutSection } from '@/components/landing/about-section';
import { TeamSection } from '@/components/landing/team-section';
import { Footer } from '@/components/landing/footer';
import { ScrollProgress } from '@/components/landing/scroll-progress';

export default function LandingPage() {
  return (
    <div className="flex flex-col bg-background">
      <ScrollProgress />

      {/* Hero viewport */}
      <div className="h-screen flex flex-col overflow-hidden relative">
        <LandingNavbar />
        <HeroSection />
      </div>

      {/* Divider */}
      <div className="section-divider" />

      {/* Scrollable sections */}
      <FeaturesSection />
      <div className="section-divider" />
      <AboutSection />
      <div className="section-divider" />
      <TeamSection />
      <Footer />
    </div>
  );
}
