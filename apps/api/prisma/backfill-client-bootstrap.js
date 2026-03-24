/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_RESOURCE_ROLE_NAMES = [
  'Project Manager',
  'Developer',
  'Architect',
  'DSI',
  'Consultant',
];

function readDefaultProfiles() {
  const p = path.join(__dirname, 'default-profiles.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function ensureClientModules(clientId, activeModuleIds) {
  if (activeModuleIds.length === 0) return 0;
  const res = await prisma.clientModule.createMany({
    data: activeModuleIds.map((moduleId) => ({
      clientId,
      moduleId,
      status: 'ENABLED',
    })),
    skipDuplicates: true,
  });
  return res.count;
}

async function ensureDefaultProfiles(clientId, profiles, permissionByCode) {
  let createdRoleCount = 0;
  let createdLinkCount = 0;

  for (const profile of profiles) {
    let role = await prisma.role.findFirst({
      where: { clientId, name: profile.name },
      select: { id: true },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          clientId,
          name: profile.name,
          description: profile.description ?? null,
          isSystem: true,
        },
        select: { id: true },
      });
      createdRoleCount += 1;
    }

    const permissionIds = profile.permissionCodes
      .map((code) => permissionByCode.get(code))
      .filter(Boolean);
    if (permissionIds.length === 0) continue;

    const res = await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
    createdLinkCount += res.count;
  }

  return { createdRoleCount, createdLinkCount };
}

async function ensureResourcesBootstrap(clientId, permissionByCode) {
  let createdRoleCount = 0;
  let createdLinkCount = 0;

  const managerPermissionIds = [
    permissionByCode.get('resources.read'),
    permissionByCode.get('resources.create'),
    permissionByCode.get('resources.update'),
  ].filter(Boolean);

  const viewerPermissionIds = [permissionByCode.get('resources.read')].filter(Boolean);

  async function ensureRbacRole(name, permissionIds) {
    let role = await prisma.role.findFirst({
      where: { clientId, name },
      select: { id: true },
    });
    if (!role) {
      role = await prisma.role.create({
        data: { clientId, name, isSystem: true },
        select: { id: true },
      });
      createdRoleCount += 1;
    }
    if (permissionIds.length > 0) {
      const res = await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
      createdLinkCount += res.count;
    }
  }

  await ensureRbacRole('Resource Manager', managerPermissionIds);
  await ensureRbacRole('Resource Viewer', viewerPermissionIds);

  for (const name of DEFAULT_RESOURCE_ROLE_NAMES) {
    await prisma.resourceRole.upsert({
      where: { clientId_name: { clientId, name } },
      update: {},
      create: { clientId, name },
    });
  }

  return { createdRoleCount, createdLinkCount };
}

async function main() {
  const clients = await prisma.client.findMany({
    select: { id: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });
  const activeModules = await prisma.module.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  });
  const permissions = await prisma.permission.findMany({
    select: { id: true, code: true },
  });
  const permissionByCode = new Map(permissions.map((p) => [p.code, p.id]));
  const profiles = readDefaultProfiles();

  const missingProfileCodes = Array.from(
    new Set(profiles.flatMap((p) => p.permissionCodes)),
  ).filter((code) => !permissionByCode.has(code));
  if (missingProfileCodes.length > 0) {
    throw new Error(
      `Permissions manquantes pour default profiles: ${missingProfileCodes.join(', ')}`,
    );
  }

  const requiredResources = ['resources.read', 'resources.create', 'resources.update'];
  const missingResourcesCodes = requiredResources.filter((code) => !permissionByCode.has(code));
  if (missingResourcesCodes.length > 0) {
    throw new Error(
      `Permissions resources manquantes: ${missingResourcesCodes.join(', ')}`,
    );
  }

  let totalClientModules = 0;
  let totalRoles = 0;
  let totalRolePermissions = 0;

  for (const client of clients) {
    const modulesAdded = await ensureClientModules(
      client.id,
      activeModules.map((m) => m.id),
    );
    const defaults = await ensureDefaultProfiles(client.id, profiles, permissionByCode);
    const resources = await ensureResourcesBootstrap(client.id, permissionByCode);

    totalClientModules += modulesAdded;
    totalRoles += defaults.createdRoleCount + resources.createdRoleCount;
    totalRolePermissions += defaults.createdLinkCount + resources.createdLinkCount;

    console.log(
      `[${client.slug}] modules+${modulesAdded}, roles+${defaults.createdRoleCount + resources.createdRoleCount}, role_permissions+${defaults.createdLinkCount + resources.createdLinkCount}`,
    );
  }

  console.log('---');
  console.log(`clients: ${clients.length}`);
  console.log(`client_modules added: ${totalClientModules}`);
  console.log(`roles added: ${totalRoles}`);
  console.log(`role_permissions added: ${totalRolePermissions}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

