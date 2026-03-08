const path = require('path');
const fs = require('fs');

// Charger .env depuis apps/api/.env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

/**
 * Platform Admin (développement).
 * Cet utilisateur a isPlatformAdmin = true et peut appeler GET/POST/PATCH/DELETE /api/clients.
 * Il est aussi rattaché au client démo en CLIENT_ADMIN.
 */
const PLATFORM_ADMIN = {
  email: 'admin@starium.fr',
  password: 'mot de passe',
  firstName: 'Platform',
  lastName: 'Admin',
};

async function main() {
  const passwordHash = await bcrypt.hash(PLATFORM_ADMIN.password, 10);
  const user = await prisma.user.upsert({
    where: { email: PLATFORM_ADMIN.email },
    update: { passwordHash, isPlatformAdmin: true },
    create: {
      email: PLATFORM_ADMIN.email,
      passwordHash,
      firstName: PLATFORM_ADMIN.firstName,
      lastName: PLATFORM_ADMIN.lastName,
      isPlatformAdmin: true,
    },
  });

  const client = await prisma.client.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Client démo',
      slug: 'demo',
    },
  });

  await prisma.clientUser.upsert({
    where: {
      userId_clientId: {
        userId: user.id,
        clientId: client.id,
      },
    },
    update: { role: 'CLIENT_ADMIN', status: 'ACTIVE' },
    create: {
      userId: user.id,
      clientId: client.id,
      role: 'CLIENT_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Seed OK: Platform Admin', PLATFORM_ADMIN.email, 'client', client.slug, 'ClientUser créé ou mis à jour.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
