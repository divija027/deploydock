import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@droplets.local' },
    update: {},
    create: {
      email: 'admin@droplets.local',
      name: 'Admin',
      password: passwordHash,
      role: 'admin',
    },
  });
  console.log('Seeded admin user: admin@droplets.local / admin123');
}

main().then(() => prisma.$disconnect());
