// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.SUPER_ADMIN_NAME?.trim() || 'Super Admin';
  const rawPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !rawPassword) {
    throw new Error(
      'Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in your .env file.'
    );
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: 'ADMIN',
      password: hashedPassword,
    },
    create: {
      email,
      name,
      role: 'ADMIN',
      password: hashedPassword,
    },
  });

  console.log(`✅ Permanent Super Admin ready: ${superAdmin.email} (Role: ${superAdmin.role})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
