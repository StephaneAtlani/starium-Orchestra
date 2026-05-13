import { OrgUnitStatus } from '@prisma/client';
import { OrganizationScopeService } from './organization-scope.service';
import type { RequestWithClient } from '../types/request-with-client';
import type { ResolveOrgScopeInput } from './organization-scope.types';

/**
 * RFC-ACL-016 — Tests unitaires du service de résolution de scope.
 *
 * Fixtures Prisma minimales via `jest.fn()` : on capture les `where` envoyés au mock pour
 * vérifier le respect de `clientId` (multi-tenant) et l'usage du cache requête.
 */

type UnitRow = {
  id: string;
  clientId: string;
  parentId: string | null;
  status: OrgUnitStatus;
  archivedAt: Date | null;
};

type MembershipRow = {
  id: string;
  clientId: string;
  resourceId: string;
  orgUnitId: string;
  startsAt: Date | null;
  endsAt: Date | null;
};

type ClientUserRow = {
  userId: string;
  clientId: string;
  resourceId: string | null;
};

function makePrismaMock(fixtures: {
  clientUsers?: ClientUserRow[];
  units?: UnitRow[];
  memberships?: MembershipRow[];
}) {
  const clientUsers = fixtures.clientUsers ?? [];
  const units = fixtures.units ?? [];
  const memberships = fixtures.memberships ?? [];

  const findUnique = jest.fn(async (args: { where: { userId_clientId: { userId: string; clientId: string } }; select?: unknown }) => {
    const { userId, clientId } = args.where.userId_clientId;
    const row = clientUsers.find((cu) => cu.userId === userId && cu.clientId === clientId);
    if (!row) return null;
    return { resourceId: row.resourceId };
  });

  const orgUnitFindMany = jest.fn(async (args: { where: { clientId: string; status: OrgUnitStatus; archivedAt: null } }) => {
    const { clientId } = args.where;
    return units
      .filter(
        (u) =>
          u.clientId === clientId &&
          u.status === OrgUnitStatus.ACTIVE &&
          u.archivedAt === null,
      )
      .map((u) => ({ id: u.id, parentId: u.parentId }));
  });

  const orgUnitMembershipFindMany = jest.fn(async (args: any) => {
    const { clientId, resourceId } = args.where;
    const now: Date = args.where.AND?.[0]?.OR?.[1]?.startsAt?.lte ?? new Date();
    const activeOrgUnitIds = new Set(
      units
        .filter(
          (u) =>
            u.clientId === clientId &&
            u.status === OrgUnitStatus.ACTIVE &&
            u.archivedAt === null,
        )
        .map((u) => u.id),
    );
    return memberships
      .filter((m) => m.clientId === clientId && m.resourceId === resourceId)
      .filter((m) => m.startsAt === null || m.startsAt.getTime() <= now.getTime())
      .filter((m) => m.endsAt === null || m.endsAt.getTime() >= now.getTime())
      .filter((m) => activeOrgUnitIds.has(m.orgUnitId))
      .map((m) => ({ orgUnitId: m.orgUnitId }));
  });

  return {
    prisma: {
      clientUser: { findUnique },
      orgUnit: { findMany: orgUnitFindMany },
      orgUnitMembership: { findMany: orgUnitMembershipFindMany },
    },
    spies: { findUnique, orgUnitFindMany, orgUnitMembershipFindMany },
  };
}

function makeRequest(): RequestWithClient {
  return {} as RequestWithClient;
}

function baseInput(over: Partial<ResolveOrgScopeInput> = {}): ResolveOrgScopeInput {
  return {
    clientId: 'client-A',
    userId: 'user-1',
    resource: { ownerOrgUnitId: null },
    ...over,
  };
}

const activeUnit = (id: string, parentId: string | null = null, clientId = 'client-A'): UnitRow => ({
  id,
  clientId,
  parentId,
  status: OrgUnitStatus.ACTIVE,
  archivedAt: null,
});

const archivedUnit = (id: string, parentId: string | null = null, clientId = 'client-A'): UnitRow => ({
  id,
  clientId,
  parentId,
  status: OrgUnitStatus.ARCHIVED,
  archivedAt: new Date('2025-01-01'),
});

describe('OrganizationScopeService.resolveOrgScope', () => {
  describe('court-circuit ALL', () => {
    it('1. ALL override avec code explicite — 0 appel Prisma', async () => {
      const { prisma, spies } = makePrismaMock({});
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ hasAllOverride: true, allReasonCode: 'ALL_RBAC_OVERRIDE' }),
      );
      expect(verdict).toEqual({ level: 'ALL', reasonCodes: ['ALL_RBAC_OVERRIDE'] });
      expect(spies.findUnique).not.toHaveBeenCalled();
      expect(spies.orgUnitFindMany).not.toHaveBeenCalled();
      expect(spies.orgUnitMembershipFindMany).not.toHaveBeenCalled();
    });

    it('2. ALL override sans allReasonCode → défaut ALL_RBAC_OVERRIDE', async () => {
      const { prisma } = makePrismaMock({});
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(baseInput({ hasAllOverride: true }));
      expect(verdict).toEqual({ level: 'ALL', reasonCodes: ['ALL_RBAC_OVERRIDE'] });
    });

    it('3. ALL override avec code générique ALL_OVERRIDE', async () => {
      const { prisma } = makePrismaMock({});
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ hasAllOverride: true, allReasonCode: 'ALL_OVERRIDE' }),
      );
      expect(verdict).toEqual({ level: 'ALL', reasonCodes: ['ALL_OVERRIDE'] });
    });

    it('4. allReasonCode runtime — la valeur OrgScopeAllReasonCode est conservée telle quelle', async () => {
      const { prisma } = makePrismaMock({});
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ hasAllOverride: true, allReasonCode: 'ALL_OVERRIDE' }),
      );
      expect(verdict.reasonCodes).toContain('ALL_OVERRIDE');
      expect(verdict.reasonCodes).not.toContain('ALL_RBAC_OVERRIDE');
    });
  });

  describe('ClientUser introuvable / sans HUMAN', () => {
    it('5. ClientUser introuvable (cross-tenant) → NONE + OWN_NO_RESOURCE_LINK + SCOPE_NO_RESOURCE_LINK, pas de findMany memberships', async () => {
      const { prisma, spies } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-OTHER', resourceId: 'res-1' }],
        units: [activeUnit('ou-1')],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-1' } }),
      );
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toEqual(
        expect.arrayContaining(['OWN_NO_RESOURCE_LINK', 'SCOPE_NO_RESOURCE_LINK']),
      );
      expect(spies.orgUnitMembershipFindMany).not.toHaveBeenCalled();
    });

    it('6. ClientUser.resourceId === null → identique au cas 5', async () => {
      const { prisma, spies } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: null }],
        units: [activeUnit('ou-1')],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-1' } }),
      );
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toEqual(
        expect.arrayContaining(['OWN_NO_RESOURCE_LINK', 'SCOPE_NO_RESOURCE_LINK']),
      );
      expect(spies.orgUnitMembershipFindMany).not.toHaveBeenCalled();
    });
  });

  describe('ownerOrgUnitId manquant', () => {
    it('7. ownerOrgUnitId null sans OWN → NONE + MISSING_OWNER_ORG_UNIT', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [activeUnit('ou-1')],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'ou-1', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: null } }),
      );
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toContain('MISSING_OWNER_ORG_UNIT');
      expect(verdict.reasonCodes).toContain('OWN_NO_HINT');
    });
  });

  describe('OWN', () => {
    it('8. OWN strict prioritaire — subjectResourceId === ctx.resourceId même si owner hors scope', async () => {
      const { prisma, spies } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-self' }],
        units: [activeUnit('ou-1'), activeUnit('ou-2')],
        memberships: [],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({
          resource: { ownerOrgUnitId: 'ou-2', ownHints: { subjectResourceId: 'res-self' } },
        }),
      );
      expect(verdict).toEqual({ level: 'OWN', reasonCodes: ['OWN_SELF_MATCH'] });
      expect(spies.orgUnitFindMany).not.toHaveBeenCalled();
    });

    it('9. OWN mismatch — subjectResourceId !== ctx.resourceId', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-self' }],
        units: [activeUnit('ou-1')],
        memberships: [],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({
          resource: { ownerOrgUnitId: 'ou-1', ownHints: { subjectResourceId: 'res-other' } },
        }),
      );
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toContain('OWN_MISMATCH');
    });

    it('10. OWN no hint — subjectResourceId undefined', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-self' }],
        units: [activeUnit('ou-1')],
        memberships: [],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-1' } }),
      );
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toContain('OWN_NO_HINT');
    });
  });

  describe('SCOPE', () => {
    it('11. SCOPE direct — membership sur l\'unité owner', async () => {
      const { prisma, spies } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [activeUnit('ou-1')],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'ou-1', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-1' } }),
      );
      expect(verdict).toEqual({ level: 'SCOPE', reasonCodes: ['SCOPE_DIRECT_MATCH'] });
      // Match direct = pas de chargement d'arbre nécessaire.
      expect(spies.orgUnitFindMany).not.toHaveBeenCalled();
    });

    it('12. SCOPE descendant profond — arbre 4 niveaux, membership niveau 1, owner niveau 4', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [
          activeUnit('lvl1', null),
          activeUnit('lvl2', 'lvl1'),
          activeUnit('lvl3', 'lvl2'),
          activeUnit('lvl4', 'lvl3'),
        ],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'lvl1', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'lvl4' } }),
      );
      expect(verdict).toEqual({ level: 'SCOPE', reasonCodes: ['SCOPE_DESCENDANT_MATCH'] });
    });

    it('13. Hors sous-arbre (owner actif, autre branche) → NONE + SCOPE_OUT_OF_SUBTREE', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [
          activeUnit('root', null),
          activeUnit('branchA', 'root'),
          activeUnit('branchB', 'root'),
          activeUnit('leafA', 'branchA'),
          activeUnit('leafB', 'branchB'),
        ],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'branchA', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'leafB' } }),
      );
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toContain('SCOPE_OUT_OF_SUBTREE');
      expect(verdict.reasonCodes).not.toContain('SCOPE_OWNER_ORG_UNIT_INACTIVE');
    });

    it('14. Owner archivé → NONE + SCOPE_OWNER_ORG_UNIT_INACTIVE (et non SCOPE_OUT_OF_SUBTREE)', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [
          activeUnit('root', null),
          archivedUnit('ou-archived', 'root'),
        ],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'root', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-archived' } }),
      );
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toContain('SCOPE_OWNER_ORG_UNIT_INACTIVE');
      expect(verdict.reasonCodes).not.toContain('SCOPE_OUT_OF_SUBTREE');
    });

    it('15. Owner inexistant / autre client → NONE + SCOPE_OWNER_ORG_UNIT_INACTIVE', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [
          activeUnit('ou-A1'),
          activeUnit('ou-B1', null, 'client-B'),
        ],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'ou-A1', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-B1' } }),
      );
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toContain('SCOPE_OWNER_ORG_UNIT_INACTIVE');
    });

    it('16. Parent archivé coupe la propagation — A(actif) → B(ARCHIVED) → C(actif), membership A, owner C → SCOPE_OUT_OF_SUBTREE', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [
          activeUnit('A', null),
          archivedUnit('B', 'A'),
          activeUnit('C', 'B'),
        ],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'A', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'C' } }),
      );
      expect(verdict.level).toBe('NONE');
      // C est actif (présent dans activeIds) mais inaccessible depuis A car B est absent du tree.
      expect(verdict.reasonCodes).toContain('SCOPE_OUT_OF_SUBTREE');
      expect(verdict.reasonCodes).not.toContain('SCOPE_OWNER_ORG_UNIT_INACTIVE');
    });

    it('17. Distinction SCOPE_NO_RESOURCE_LINK vs SCOPE_NO_MEMBERSHIPS — resourceId existe mais 0 membership', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [activeUnit('ou-1')],
        memberships: [],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-1' } }),
      );
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toContain('SCOPE_NO_MEMBERSHIPS');
      expect(verdict.reasonCodes).not.toContain('SCOPE_NO_RESOURCE_LINK');
    });
  });

  describe('multi-tenant', () => {
    it('18. Cross-tenant — aucune fuite : tous les where Prisma contiennent clientId', async () => {
      const { prisma, spies } = makePrismaMock({
        clientUsers: [
          { userId: 'user-1', clientId: 'client-A', resourceId: 'res-A' },
        ],
        units: [activeUnit('ou-A', null, 'client-A'), activeUnit('ou-B', null, 'client-B')],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-A', orgUnitId: 'ou-A', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope({
        clientId: 'client-B',
        userId: 'user-1',
        resource: { ownerOrgUnitId: 'ou-B' },
      });
      expect(verdict.level).toBe('NONE');
      expect(verdict.reasonCodes).toEqual(
        expect.arrayContaining(['OWN_NO_RESOURCE_LINK', 'SCOPE_NO_RESOURCE_LINK']),
      );
      // ClientUser lookup utilise userId_clientId composé sur client-B.
      expect(spies.findUnique).toHaveBeenCalledWith({
        where: { userId_clientId: { userId: 'user-1', clientId: 'client-B' } },
        select: { resourceId: true },
      });
      // Aucun findMany memberships car ClientUser introuvable.
      expect(spies.orgUnitMembershipFindMany).not.toHaveBeenCalled();
    });
  });

  describe('période memberships', () => {
    it('19. startsAt et endsAt null → membership inclus', async () => {
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [activeUnit('ou-1')],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'ou-1', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-1' } }),
      );
      expect(verdict.level).toBe('SCOPE');
    });

    it('20. Memberships expirés / futurs → exclus', async () => {
      const past = new Date(Date.now() - 86_400_000 * 30);
      const future = new Date(Date.now() + 86_400_000 * 30);
      const { prisma } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [activeUnit('ou-1'), activeUnit('ou-2')],
        memberships: [
          { id: 'm-expired', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'ou-1', startsAt: past, endsAt: past },
          { id: 'm-future', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'ou-2', startsAt: future, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const verdict1 = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-1' } }),
      );
      expect(verdict1.level).toBe('NONE');
      expect(verdict1.reasonCodes).toContain('SCOPE_NO_MEMBERSHIPS');

      const verdict2 = await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-2' } }),
      );
      expect(verdict2.level).toBe('NONE');
    });
  });

  describe('cache requête', () => {
    it('21. Cache resolvedOrgUnitTreeByClient — 2 appels même request/clientId → 1 seul findMany OrgUnit', async () => {
      const { prisma, spies } = makePrismaMock({
        clientUsers: [
          { userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' },
          { userId: 'user-2', clientId: 'client-A', resourceId: 'res-2' },
        ],
        units: [
          activeUnit('root', null),
          activeUnit('child', 'root'),
        ],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'root', startsAt: null, endsAt: null },
          { id: 'm2', clientId: 'client-A', resourceId: 'res-2', orgUnitId: 'root', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const request = makeRequest();
      await svc.resolveOrgScope({
        clientId: 'client-A',
        userId: 'user-1',
        resource: { ownerOrgUnitId: 'child' },
        request,
      });
      await svc.resolveOrgScope({
        clientId: 'client-A',
        userId: 'user-2',
        resource: { ownerOrgUnitId: 'child' },
        request,
      });
      expect(spies.orgUnitFindMany).toHaveBeenCalledTimes(1);
    });

    it('22. Cache resolvedOrgScopeContext — 2 appels même request/userId/clientId → 1 seul ClientUser + 1 seul memberships findMany', async () => {
      const { prisma, spies } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [
          activeUnit('root', null),
          activeUnit('child', 'root'),
        ],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'root', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      const request = makeRequest();
      await svc.resolveOrgScope({
        clientId: 'client-A',
        userId: 'user-1',
        resource: { ownerOrgUnitId: 'root' },
        request,
      });
      await svc.resolveOrgScope({
        clientId: 'client-A',
        userId: 'user-1',
        resource: { ownerOrgUnitId: 'child' },
        request,
      });
      expect(spies.findUnique).toHaveBeenCalledTimes(1);
      expect(spies.orgUnitMembershipFindMany).toHaveBeenCalledTimes(1);
    });

    it('23. Pas de request → cache opt-in : 2 appels = 2× requêtes Prisma', async () => {
      const { prisma, spies } = makePrismaMock({
        clientUsers: [{ userId: 'user-1', clientId: 'client-A', resourceId: 'res-1' }],
        units: [activeUnit('ou-1')],
        memberships: [
          { id: 'm1', clientId: 'client-A', resourceId: 'res-1', orgUnitId: 'ou-1', startsAt: null, endsAt: null },
        ],
      });
      const svc = new OrganizationScopeService(prisma as any);
      await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-1' } }),
      );
      await svc.resolveOrgScope(
        baseInput({ resource: { ownerOrgUnitId: 'ou-1' } }),
      );
      expect(spies.findUnique).toHaveBeenCalledTimes(2);
      expect(spies.orgUnitMembershipFindMany).toHaveBeenCalledTimes(2);
    });
  });
});
