/**
 * RFC-PROJ-023 P0bis — dry-run / rapport migration RASCI roleId → identityKey.
 *
 * Usage:
 *   cd apps/api && pnpm exec ts-node -r tsconfig-paths/register scripts/raci-migrate-identity-dry-run.ts
 *
 * Avant apply : liste les cellules encore sans identityKey personne et estime l’éclatement.
 * Après apply : rapport des cellules personne vs placeholders `legacy-role:*` + collisions A.
 */
import { PrismaClient, ProjectRaciKind } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [total, personCells, legacyPlaceholders, cellsNeedingExpand] = await Promise.all([
    prisma.projectRaciCell.count(),
    prisma.projectRaciCell.count({
      where: { NOT: { identityKey: { startsWith: 'legacy-role:' } } },
    }),
    prisma.projectRaciCell.count({
      where: { identityKey: { startsWith: 'legacy-role:' } },
    }),
    prisma.projectRaciCell.findMany({
      where: {
        OR: [
          { identityKey: { startsWith: 'legacy-role:' } },
          // Schéma pré-migration éventuel (colonne absente = impossible ici)
        ],
      },
      select: {
        id: true,
        clientId: true,
        projectId: true,
        actionId: true,
        roleId: true,
        identityKey: true,
        kind: true,
      },
    }),
  ]);

  const roleIds = [
    ...new Set(cellsNeedingExpand.map((c) => c.roleId).filter(Boolean)),
  ] as string[];
  const members =
    roleIds.length === 0
      ? []
      : await prisma.projectTeamMember.findMany({
          where: { roleId: { in: roleIds } },
          select: {
            roleId: true,
            projectId: true,
            identityKey: true,
            freeLabel: true,
          },
        });

  const byRoleProject = new Map<string, typeof members>();
  for (const m of members) {
    const key = `${m.projectId}:${m.roleId}`;
    const list = byRoleProject.get(key) ?? [];
    list.push(m);
    byRoleProject.set(key, list);
  }

  let wouldExpand = 0;
  let orphanRoles = 0;
  const orphanSamples: string[] = [];

  for (const c of cellsNeedingExpand) {
    if (!c.roleId) {
      orphanRoles += 1;
      continue;
    }
    const list = byRoleProject.get(`${c.projectId}:${c.roleId}`) ?? [];
    if (list.length === 0) {
      orphanRoles += 1;
      if (orphanSamples.length < 10) {
        orphanSamples.push(`${c.projectId}/${c.actionId}/${c.roleId}`);
      }
    } else {
      wouldExpand += list.length;
    }
  }

  const accountable = await prisma.projectRaciCell.groupBy({
    by: ['projectId', 'actionId'],
    where: {
      kind: ProjectRaciKind.ACCOUNTABLE,
      NOT: { identityKey: { startsWith: 'legacy-role:' } },
    },
    _count: { _all: true },
  });
  const accountableCollisions = accountable.filter((a) => a._count._all > 1).length;

  console.log(
    JSON.stringify(
      {
        dryRun: true,
        migrationApplied: personCells > 0 || legacyPlaceholders > 0,
        totalCells: total,
        personCells,
        legacyRolePlaceholderCells: legacyPlaceholders,
        legacyWouldExpandToPersonCells: wouldExpand,
        legacyRolesWithoutMembers: orphanRoles,
        orphanSamples,
        actionsWithMultipleAccountable: accountableCollisions,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
