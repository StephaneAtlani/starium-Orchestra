import { Injectable } from '@nestjs/common';
import { OrgUnitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestWithClient } from '../types/request-with-client';
import type {
  OrgScopeOrgUnitTree,
  OrgScopeReasonCode,
  OrgScopeUserContext,
  OrgScopeVerdict,
  ResolveOrgScopeInput,
} from './organization-scope.types';

/**
 * RFC-ACL-016 — Résolution du scope organisationnel.
 *
 * Retourne, pour un trio `(userId, clientId, ressource)`, un verdict `ALL | OWN | SCOPE | NONE`
 * accompagné de `reasonCodes` stables (diagnostic RFC-ACL-019).
 *
 * **Priorité absolue** : `ALL` (court-circuit) > `OWN` (court-circuit SCOPE) > `SCOPE` > `NONE`.
 *
 * **V1 — choix figés** (cf. plan RFC-ACL-016) :
 * - SCOPE = descendants des memberships HUMAN actives de l'utilisateur (BFS in-memory).
 * - OWN  = `ownHints.subjectResourceId === ClientUser.resourceId` (self HUMAN).
 * - ALL  = pré-calculé par l'appelant (`hasAllOverride`). Aucun couplage RBAC dans ce service.
 *
 * **Multi-tenant** : `clientId` est toujours dans le `where` Prisma (`ClientUser`, `OrgUnit`,
 * `OrgUnitMembership`). Aucune exception ne fuit entre clients : un `ClientUser` introuvable
 * retourne un contexte vide (pas de throw).
 *
 * **Performance** : 2 caches par requête HTTP (`resolvedOrgScopeContext`,
 * `resolvedOrgUnitTreeByClient`). Pas de CTE PostgreSQL en V1.
 * PERF : passer en `WITH RECURSIVE` si N(orgUnits/client) dépasse ~10 000.
 */
@Injectable()
export class OrganizationScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveOrgScope(input: ResolveOrgScopeInput): Promise<OrgScopeVerdict> {
    const { clientId, userId, resource, hasAllOverride, allReasonCode, request } = input;

    // 1. Court-circuit ALL — aucun accès Prisma.
    if (hasAllOverride === true) {
      return {
        level: 'ALL',
        reasonCodes: [allReasonCode ?? 'ALL_RBAC_OVERRIDE'],
      };
    }

    // 2. Charger le contexte HUMAN (resourceId + memberships actives) avec memoize requête.
    const ctx = await this.loadUserOrgContext(userId, clientId, request);

    // 3. Évaluer OWN — court-circuite SCOPE si match.
    const ownReasons: OrgScopeReasonCode[] = [];
    const subjectResourceId = resource.ownHints?.subjectResourceId ?? null;

    if (
      ctx.resourceId !== null &&
      subjectResourceId !== null &&
      subjectResourceId === ctx.resourceId
    ) {
      return { level: 'OWN', reasonCodes: ['OWN_SELF_MATCH'] };
    }

    if (ctx.resourceId === null) {
      ownReasons.push('OWN_NO_RESOURCE_LINK');
    } else if (subjectResourceId === null) {
      ownReasons.push('OWN_NO_HINT');
    } else {
      ownReasons.push('OWN_MISMATCH');
    }

    // 4. Évaluer SCOPE — cumulé avec ownReasons si SCOPE échoue.
    const scopeReasons: OrgScopeReasonCode[] = [];

    if (ctx.resourceId === null) {
      scopeReasons.push('SCOPE_NO_RESOURCE_LINK');
    } else if (ctx.membershipOrgUnitIds.size === 0) {
      scopeReasons.push('SCOPE_NO_MEMBERSHIPS');
    }

    if (resource.ownerOrgUnitId === null) {
      scopeReasons.push('MISSING_OWNER_ORG_UNIT');
      return { level: 'NONE', reasonCodes: [...ownReasons, ...scopeReasons] };
    }

    // Si l'un des verrous "no link / no memberships" est posé : SCOPE inévaluable, retour NONE.
    if (scopeReasons.length > 0) {
      return { level: 'NONE', reasonCodes: [...ownReasons, ...scopeReasons] };
    }

    // Match direct (avant chargement de l'arbre) : économise un findMany OrgUnit.
    if (ctx.membershipOrgUnitIds.has(resource.ownerOrgUnitId)) {
      return { level: 'SCOPE', reasonCodes: ['SCOPE_DIRECT_MATCH'] };
    }

    const tree = await this.loadOrgUnitTree(clientId, request);

    // Owner inactif (archivé / inexistant / autre client) : diagnostic dédié, distinct du hors-scope.
    if (!tree.activeIds.has(resource.ownerOrgUnitId)) {
      scopeReasons.push('SCOPE_OWNER_ORG_UNIT_INACTIVE');
      return { level: 'NONE', reasonCodes: [...ownReasons, ...scopeReasons] };
    }

    // BFS sur l'arbre actif depuis les memberships.
    const coveredIds = this.expandSubtree(ctx.membershipOrgUnitIds, tree);
    if (coveredIds.has(resource.ownerOrgUnitId)) {
      return { level: 'SCOPE', reasonCodes: ['SCOPE_DESCENDANT_MATCH'] };
    }

    scopeReasons.push('SCOPE_OUT_OF_SUBTREE');
    return { level: 'NONE', reasonCodes: [...ownReasons, ...scopeReasons] };
  }

  /**
   * Charge (ou récupère du cache requête) le contexte HUMAN de l'utilisateur pour ce client.
   *
   * `ClientUser` introuvable (cross-tenant, compte non rattaché, utilisateur supprimé) →
   * **pas d'exception** : on retourne un contexte vide. Le verdict final sera `NONE` avec
   * `OWN_NO_RESOURCE_LINK` + `SCOPE_NO_RESOURCE_LINK`.
   *
   * Schéma vérifié 2026-05-12 : `ClientUser` a `@@unique([userId, clientId])` → compound key
   * Prisma `userId_clientId`. `OrgUnitMembership.startsAt` et `endsAt` sont **nullables**, d'où le
   * double `OR` sur la fenêtre temporelle.
   */
  private async loadUserOrgContext(
    userId: string,
    clientId: string,
    request: RequestWithClient | undefined,
  ): Promise<OrgScopeUserContext> {
    const cacheKey = `${userId}:${clientId}`;
    const cached = request?.resolvedOrgScopeContext?.get(cacheKey);
    if (cached) return cached;

    const prisma = this.prisma as any;

    const clientUser = await prisma.clientUser.findUnique({
      where: { userId_clientId: { userId, clientId } },
      select: { resourceId: true },
    });

    if (!clientUser) {
      const empty: OrgScopeUserContext = {
        resourceId: null,
        membershipOrgUnitIds: new Set<string>(),
      };
      this.cacheUserContext(request, cacheKey, empty);
      return empty;
    }

    const resourceId: string | null = clientUser.resourceId ?? null;
    if (resourceId === null) {
      const noLink: OrgScopeUserContext = {
        resourceId: null,
        membershipOrgUnitIds: new Set<string>(),
      };
      this.cacheUserContext(request, cacheKey, noLink);
      return noLink;
    }

    const now = new Date();
    const memberships = await prisma.orgUnitMembership.findMany({
      where: {
        clientId,
        resourceId,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
        orgUnit: {
          status: OrgUnitStatus.ACTIVE,
          archivedAt: null,
        },
      },
      select: { orgUnitId: true },
    });

    const ctx: OrgScopeUserContext = {
      resourceId,
      membershipOrgUnitIds: new Set<string>(memberships.map((m: { orgUnitId: string }) => m.orgUnitId)),
    };
    this.cacheUserContext(request, cacheKey, ctx);
    return ctx;
  }

  /**
   * Charge (ou récupère du cache requête) l'arbre `OrgUnit` actif du client.
   *
   * Unités archivées (`status = ARCHIVED` ou `archivedAt != null`) **exclues** de l'arbre :
   * absentes de `activeIds` ET de `childrenByParent`. Conséquence assumée V1 (conservatrice) :
   * un parent archivé **coupe** la propagation du scope vers ses descendants actifs (ils ne sont
   * plus atteignables depuis ce parent dans le BFS). À reconfirmer lors du branchement RFC-ACL-018.
   */
  private async loadOrgUnitTree(
    clientId: string,
    request: RequestWithClient | undefined,
  ): Promise<OrgScopeOrgUnitTree> {
    const cached = request?.resolvedOrgUnitTreeByClient?.get(clientId);
    if (cached) return cached;

    const prisma = this.prisma as any;
    const rows: Array<{ id: string; parentId: string | null }> = await prisma.orgUnit.findMany({
      where: {
        clientId,
        status: OrgUnitStatus.ACTIVE,
        archivedAt: null,
      },
      select: { id: true, parentId: true },
    });

    const activeIds = new Set<string>(rows.map((r) => r.id));
    const childrenByParent = new Map<string | null, string[]>();
    // On indexe les enfants sous leur `parentId` brut. Si le parent est archivé, son id n'est
    // pas dans `activeIds` ; le BFS (cf. `expandSubtree`) n'enfilera jamais cet id et donc
    // n'atteindra pas ses descendants → propagation coupée par parent archivé (choix V1).
    for (const row of rows) {
      const list = childrenByParent.get(row.parentId);
      if (list) {
        list.push(row.id);
      } else {
        childrenByParent.set(row.parentId, [row.id]);
      }
    }

    const tree: OrgScopeOrgUnitTree = { childrenByParent, activeIds };
    if (request) {
      const map = request.resolvedOrgUnitTreeByClient ?? new Map<string, OrgScopeOrgUnitTree>();
      map.set(clientId, tree);
      request.resolvedOrgUnitTreeByClient = map;
    }
    return tree;
  }

  /**
   * BFS in-memory : retourne l'union des descendants atteignables depuis `seedIds`
   * (memberships actives), bornée à l'arbre actif. Le BFS ne traverse pas les parents archivés
   * (ceux-ci sont absents de `activeIds` ET ne figurent pas dans la file initiale).
   */
  private expandSubtree(
    seedIds: ReadonlySet<string>,
    tree: OrgScopeOrgUnitTree,
  ): Set<string> {
    const covered = new Set<string>();
    const queue: string[] = [];

    for (const id of seedIds) {
      if (tree.activeIds.has(id) && !covered.has(id)) {
        covered.add(id);
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift() as string;
      const children = tree.childrenByParent.get(current);
      if (!children) continue;
      for (const childId of children) {
        if (!covered.has(childId)) {
          covered.add(childId);
          queue.push(childId);
        }
      }
    }

    return covered;
  }

  private cacheUserContext(
    request: RequestWithClient | undefined,
    key: string,
    ctx: OrgScopeUserContext,
  ): void {
    if (!request) return;
    const map = request.resolvedOrgScopeContext ?? new Map<string, OrgScopeUserContext>();
    map.set(key, ctx);
    request.resolvedOrgScopeContext = map;
  }
}
