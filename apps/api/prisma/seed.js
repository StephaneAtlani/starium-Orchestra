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

  // RFC-021: permissions complètes (module.action ou module.sous-resource.action)
  const extraPermsByModule = {
    budgets: [
      'cost-centers.read',
      'cost-centers.create',
      'cost-centers.update',
      'general-ledger-accounts.read',
      'general-ledger-accounts.create',
      'general-ledger-accounts.update',
      'analytical-ledger-accounts.read',
      'analytical-ledger-accounts.create',
      'analytical-ledger-accounts.update',
    ],
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

  for (const [moduleCode, extraCodes] of Object.entries(extraPermsByModule || {})) {
    const module = moduleRecords[moduleCode];
    if (!module) continue;
    for (const fullAction of extraCodes) {
      const code = `${moduleCode}.${fullAction}`;
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

/**
 * Applique les profils par défaut à tous les clients (idempotent).
 * Lit prisma/default-profiles.json et crée/met à jour les rôles pour chaque client.
 */
async function applyDefaultProfilesForAllClients() {
  const profilesPath = path.join(__dirname, 'default-profiles.json');
  if (!fs.existsSync(profilesPath)) {
    console.log('Seed: pas de default-profiles.json, skip profils par défaut.');
    return;
  }
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  const clients = await prisma.client.findMany({ select: { id: true } });
  for (const { id: clientId } of clients) {
    for (const profile of profiles) {
      let role = await prisma.role.findFirst({
        where: { clientId, name: profile.name },
      });
      if (!role) {
        role = await prisma.role.create({
          data: {
            clientId,
            name: profile.name,
            description: profile.description ?? null,
            isSystem: true,
          },
        });
      }
      const permissions = await prisma.permission.findMany({
        where: { code: { in: profile.permissionCodes } },
        select: { id: true },
      });
      const permissionIds = permissions.map((p) => p.id);
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }
    }
  }
  console.log('Seed OK: profils par défaut appliqués pour', clients.length, 'client(s).');
}

/**
 * Client "Sitral" avec un client admin satlani@outlook.com (dev / démo).
 */
const SITRAL_CLIENT_ADMIN = {
  email: 'satlani@outlook.com',
  password: 'password',
  firstName: 'Satlani',
  lastName: 'Admin',
};

async function upsertSitralAndClientAdmin() {
  const client = await prisma.client.upsert({
    where: { slug: 'sitral' },
    update: { name: 'Sitral' },
    create: {
      name: 'Sitral',
      slug: 'sitral',
    },
  });

  const budgetModule = await prisma.module.findUnique({
    where: { code: 'budgets' },
  });
  if (budgetModule) {
    await prisma.clientModule.upsert({
      where: {
        clientId_moduleId: { clientId: client.id, moduleId: budgetModule.id },
      },
      update: { status: 'ENABLED' },
      create: {
        clientId: client.id,
        moduleId: budgetModule.id,
        status: 'ENABLED',
      },
    });
  }

  const passwordHash = await bcrypt.hash(SITRAL_CLIENT_ADMIN.password, 10);
  const user = await prisma.user.upsert({
    where: { email: SITRAL_CLIENT_ADMIN.email },
    update: {
      passwordHash,
      firstName: SITRAL_CLIENT_ADMIN.firstName,
      lastName: SITRAL_CLIENT_ADMIN.lastName,
    },
    create: {
      email: SITRAL_CLIENT_ADMIN.email,
      passwordHash,
      firstName: SITRAL_CLIENT_ADMIN.firstName,
      lastName: SITRAL_CLIENT_ADMIN.lastName,
    },
  });

  await prisma.clientUser.upsert({
    where: {
      userId_clientId: { userId: user.id, clientId: client.id },
    },
    update: {
      role: 'CLIENT_ADMIN',
      status: 'ACTIVE',
      isDefault: true,
    },
    create: {
      userId: user.id,
      clientId: client.id,
      role: 'CLIENT_ADMIN',
      status: 'ACTIVE',
      isDefault: true,
    },
  });

  console.log(
    'Seed OK: client Sitral + admin',
    SITRAL_CLIENT_ADMIN.email,
    '(CLIENT_ADMIN, module budgets activé).',
  );
}

async function main() {
  await upsertPlatformAdmin();
  await upsertModulesAndPermissions();
  await upsertSitralAndClientAdmin();
  await applyDefaultProfilesForAllClients();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
