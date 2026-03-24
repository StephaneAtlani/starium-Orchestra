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
const isProduction = process.env.NODE_ENV === 'production';

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
  const existingUser = await prisma.user.findUnique({
    where: { email: PLATFORM_ADMIN.email },
    select: { id: true },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: PLATFORM_ADMIN.email,
        passwordHash,
        firstName: PLATFORM_ADMIN.firstName,
        lastName: PLATFORM_ADMIN.lastName,
        platformRole: 'PLATFORM_ADMIN',
      },
    });
  } else if (!isProduction) {
    await prisma.user.update({
      where: { email: PLATFORM_ADMIN.email },
      data: {
        passwordHash,
        platformRole: 'PLATFORM_ADMIN',
      },
    });
  }

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
    { code: 'resources', name: 'Ressources', description: 'Catalogue ressources humaines et matériel (RFC-RES-001)' },
    { code: 'contracts', name: 'Contrats', description: 'Gestion des contrats' },
    { code: 'suppliers', name: 'Fournisseurs', description: 'Gestion des fournisseurs' },
    { code: 'procurement', name: 'Procurement', description: 'Fournisseurs, commandes, factures' },
    { code: 'licenses', name: 'Licences', description: 'Gestion des licences' },
    { code: 'audit_logs', name: 'Audit logs', description: 'Traçabilité des actions métier' },
  ];

  const permsByModule = {
    budgets: ['read', 'create', 'update', 'delete'],
    projects: ['read', 'create', 'update', 'delete'],
    resources: ['read', 'create', 'update'],
    contracts: ['read', 'create', 'update', 'delete'],
    suppliers: ['read', 'create', 'update', 'delete'],
    procurement: ['read', 'create', 'update'],
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
  const procurementModule = await prisma.module.findUnique({
    where: { code: 'procurement' },
  });
  const projectsModule = await prisma.module.findUnique({
    where: { code: 'projects' },
  });
  const resourcesModule = await prisma.module.findUnique({
    where: { code: 'resources' },
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
  if (procurementModule) {
    await prisma.clientModule.upsert({
      where: {
        clientId_moduleId: { clientId: client.id, moduleId: procurementModule.id },
      },
      update: { status: 'ENABLED' },
      create: {
        clientId: client.id,
        moduleId: procurementModule.id,
        status: 'ENABLED',
      },
    });
  }
  if (projectsModule) {
    await prisma.clientModule.upsert({
      where: {
        clientId_moduleId: { clientId: client.id, moduleId: projectsModule.id },
      },
      update: { status: 'ENABLED' },
      create: {
        clientId: client.id,
        moduleId: projectsModule.id,
        status: 'ENABLED',
      },
    });
  }
  if (resourcesModule) {
    await prisma.clientModule.upsert({
      where: {
        clientId_moduleId: { clientId: client.id, moduleId: resourcesModule.id },
      },
      update: { status: 'ENABLED' },
      create: {
        clientId: client.id,
        moduleId: resourcesModule.id,
        status: 'ENABLED',
      },
    });
    await bootstrapResourcesForClient(client.id);
  }

  const passwordHash = await bcrypt.hash(SITRAL_CLIENT_ADMIN.password, 10);
  const existingUser = await prisma.user.findUnique({
    where: { email: SITRAL_CLIENT_ADMIN.email },
  });

  let user;
  if (!existingUser) {
    user = await prisma.user.create({
      data: {
        email: SITRAL_CLIENT_ADMIN.email,
        passwordHash,
        firstName: SITRAL_CLIENT_ADMIN.firstName,
        lastName: SITRAL_CLIENT_ADMIN.lastName,
      },
    });
  } else if (!isProduction) {
    user = await prisma.user.update({
      where: { email: SITRAL_CLIENT_ADMIN.email },
      data: {
        passwordHash,
        firstName: SITRAL_CLIENT_ADMIN.firstName,
        lastName: SITRAL_CLIENT_ADMIN.lastName,
      },
    });
  } else {
    user = existingUser;
  }

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
    '(CLIENT_ADMIN, modules budgets + procurement + projects + resources activés).',
  );
}

/** Aligné sur ResourcesModuleBootstrapService (RFC-RES-001). */
async function bootstrapResourcesForClient(clientId) {
  const perms = await prisma.permission.findMany({
    where: {
      code: {
        in: ['resources.read', 'resources.create', 'resources.update'],
      },
    },
    select: { id: true, code: true },
  });
  const byCode = Object.fromEntries(perms.map((p) => [p.code, p.id]));

  async function ensureRole(name, permissionCodes) {
    const permissionIds = permissionCodes.map((c) => byCode[c]).filter(Boolean);
    let role = await prisma.role.findFirst({ where: { clientId, name } });
    if (!role) {
      role = await prisma.role.create({
        data: { clientId, name, isSystem: true },
      });
    }
    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const have = new Set(existing.map((e) => e.permissionId));
    const toAdd = permissionIds.filter((id) => !have.has(id));
    if (toAdd.length) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }

  await ensureRole('Resource Manager', [
    'resources.read',
    'resources.create',
    'resources.update',
  ]);
  await ensureRole('Resource Viewer', ['resources.read']);

  const defaultNames = [
    'Project Manager',
    'Developer',
    'Architect',
    'DSI',
    'Consultant',
  ];
  for (const name of defaultNames) {
    await prisma.resourceRole.upsert({
      where: { clientId_name: { clientId, name } },
      update: {},
      create: { clientId, name },
    });
  }
}

/**
 * Attache l’admin Sitral au rôle « Responsable Budgets » (permissions métier dont projects.*).
 */
async function linkSitralAdminToResponsableRole() {
  const client = await prisma.client.findUnique({
    where: { slug: 'sitral' },
  });
  if (!client) return;
  const user = await prisma.user.findUnique({
    where: { email: SITRAL_CLIENT_ADMIN.email },
  });
  if (!user) return;
  const role = await prisma.role.findFirst({
    where: { clientId: client.id, name: 'Responsable Budgets' },
  });
  if (!role) {
    console.log('Seed: rôle Responsable Budgets introuvable, skip UserRole admin Sitral.');
    return;
  }
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: user.id, roleId: role.id },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });
  console.log('Seed OK: UserRole admin Sitral → Responsable Budgets.');
}

async function main() {
  await upsertPlatformAdmin();
  await upsertModulesAndPermissions();
  await upsertSitralAndClientAdmin();
  await applyDefaultProfilesForAllClients();
  await linkSitralAdminToResponsableRole();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
