'use client';

import { motion } from 'framer-motion';
import { Linkedin } from 'lucide-react';
import Image from 'next/image';

const team = [
  { name: 'Aatmasree Srinivas', image: '/aatma.jpeg', linkedin: 'https://www.linkedin.com/in/aatmasree3/' },
  { name: 'Divija MV', image: '/div.jpeg', linkedin: 'https://www.linkedin.com/in/divijamv/' },
  { name: 'Jagrathi KS', image: '/jag.jpeg', linkedin: 'https://www.linkedin.com/in/jagrathi-k-s-692b4b246/' },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function TeamSection() {
  return (
    <section
      id="team"
      className="relative py-24 px-6 md:px-12 lg:px-20 bg-background font-body overflow-hidden"
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 dot-pattern opacity-40" />

      <div className="relative max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-medium uppercase tracking-widest text-accent mb-4">
            Team
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground">
            Meet the <em className="font-display italic">Team</em>
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-[500px] mx-auto leading-relaxed">
            The people behind DeployDock.
          </p>
        </motion.div>

        {/* Guide / Mentor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-16"
        >
          <p className="text-xs font-medium uppercase tracking-widest text-accent mb-5">
            Project Guide
          </p>
          <div className="group flex flex-col items-center">
            <div className="relative mb-5">
              <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-accent/25 via-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative h-36 w-36 md:h-40 md:w-40 rounded-full overflow-hidden ring-[3px] ring-accent/30 group-hover:ring-accent/60 transition-all duration-300 shadow-xl group-hover:shadow-2xl">
                <Image
                  src="/sum.jpg"
                  alt="Dr. Sumathi Pawar"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
            <h3 className="font-display text-2xl text-foreground text-center">
              Dr. Sumathi Pawar
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Guide &amp; Mentor
            </p>
          </div>

          {/* Decorative connector line */}
          <div className="mt-10 flex flex-col items-center gap-1">
            <div className="w-px h-8 bg-gradient-to-b from-accent/30 to-border" />
            <div className="h-1.5 w-1.5 rounded-full bg-border" />
          </div>
        </motion.div>

        {/* Team grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-10 justify-items-center"
        >
          {team.map((member) => (
            <motion.div
              key={member.name}
              variants={cardVariants}
              className="group flex flex-col items-center w-full max-w-[280px]"
            >
              {/* Photo with accent ring + gradient hover */}
              <div className="relative mb-6">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-accent/30 via-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                <div className="relative h-32 w-32 md:h-36 md:w-36 rounded-full overflow-hidden ring-2 ring-border group-hover:ring-accent/50 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>

              {/* Name */}
              <h3 className="font-display text-xl text-foreground text-center">
                {member.name}
              </h3>

              {/* LinkedIn */}
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
