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
 * Cet utilisateur est UNIQUEMENT Platform Admin (platformRole = PLATFORM_ADMIN).
 * Il peut appeler GET/POST/PATCH/DELETE /api/clients.
 * Il n'est rattaché à aucun client : pas de ClientUser, donc pas CLIENT_ADMIN.
 */
const PLATFORM_ADMIN = {
  email: 'admin@starium.fr',
  password: 'mot de passe',
  firstName: 'Platform',
  lastName: 'Admin',
};

async function upsertPlatformAdmin() {
  const passwordHash = await bcrypt.hash(PLATFORM_ADMIN.password, 10);
  await prisma.user.upsert({
    where: { email: PLATFORM_ADMIN.email },
    update: { passwordHash, platformRole: 'PLATFORM_ADMIN' },
    create: {
      email: PLATFORM_ADMIN.email,
      passwordHash,
      firstName: PLATFORM_ADMIN.firstName,
      lastName: PLATFORM_ADMIN.lastName,
      platformRole: 'PLATFORM_ADMIN',
    },
  });

  console.log(
    'Seed OK: Platform Admin',
    PLATFORM_ADMIN.email,
    '(aucun client rattaché).',
  );
}

async function upsertModulesAndPermissions() {
  const modules = [
    { code: 'budgets', name: 'Budgets', description: 'Gestion des budgets IT' },
    { code: 'projects', name: 'Projets', description: 'Gestion des projets IT' },
    { code: 'contracts', name: 'Contrats', description: 'Gestion des contrats' },
    { code: 'suppliers', name: 'Fournisseurs', description: 'Gestion des fournisseurs' },
    { code: 'licenses', name: 'Licences', description: 'Gestion des licences' },
    { code: 'audit_logs', name: 'Audit logs', description: 'Traçabilité des actions métier' },
  ];

  const permsByModule = {
    budgets: ['read', 'create', 'update', 'delete'],
    projects: ['read', 'create', 'update', 'delete'],
    contracts: ['read', 'create', 'update', 'delete'],
    suppliers: ['read', 'create', 'update', 'delete'],
    licenses: ['read', 'create', 'update', 'delete'],
    audit_logs: ['read', 'export', 'delete'],
  };

  const moduleRecords = {};

  for (const m of modules) {
    const record = await prisma.module.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        description: m.description,
        isActive: true,
      },
      create: {
        code: m.code,
        name: m.name,
        description: m.description,
        isActive: true,
      },
    });
    moduleRecords[m.code] = record;
  }

  for (const [moduleCode, actions] of Object.entries(permsByModule)) {
    const module = moduleRecords[moduleCode];
    for (const action of actions) {
      const code = `${moduleCode}.${action}`;
      await prisma.permission.upsert({
        where: { code },
        update: {
          label: code,
          description: null,
          moduleId: module.id,
        },
        create: {
          code,
          label: code,
          description: null,
          moduleId: module.id,
        },
      });
    }
  }

  console.log('Seed OK: modules et permissions globales (référentiel plateforme).');
}

async function main() {
  await upsertPlatformAdmin();
  await upsertModulesAndPermissions();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
