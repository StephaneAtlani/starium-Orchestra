import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserClientAccessService } from '../chatbot/user-client-access.service';
import type { SearchAdapter, SearchAdapterContext } from './search.adapter';
import {
  SEARCH_MAX_GLOBAL,
  SEARCH_MAX_PER_MODULE,
  SEARCH_MODULE_GROUP_ORDER,
} from './search.constants';
import { SEARCH_ADAPTERS } from './search.tokens';
import type { GlobalSearchResponseDto, InternalSearchHit } from './search.types';
import { normalizeQueryForSearch } from './search-text-build.util';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_ADAPTERS) private readonly adapters: SearchAdapter[],
    private readonly userAccess: UserClientAccessService,
  ) {}

  async search(
    userId: string,
    clientId: string,
    q: string | undefined,
  ): Promise<GlobalSearchResponseDto> {
    const normalizedQuery = normalizeQueryForSearch((q ?? '').trim());
    if (!normalizedQuery) {
      return { groups: [], total: 0 };
    }

    const permissionCodes = await this.userAccess.resolvePermissionCodes(
      userId,
      clientId,
    );
    const ctx: SearchAdapterContext = {
      userId,
      clientId,
      normalizedQuery,
      permissionCodes,
    };

    let batches: InternalSearchHit[][];
    try {
      batches = await Promise.all(
        this.adapters.map((adapter) => adapter.search(ctx)),
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2022'
      ) {
        throw new ServiceUnavailableException(
          'Base non à jour : appliquer les migrations Prisma (`pnpm prisma migrate deploy` dans apps/api), puis éventuellement `pnpm backfill:search-text`.',
        );
      }
      throw e;
    }
    const allHits = batches.flat();

    const byModule = new Map<string, InternalSearchHit[]>();
    for (const h of allHits) {
      const arr = byModule.get(h.moduleCode) ?? [];
      arr.push(h);
      byModule.set(h.moduleCode, arr);
    }

    const perModuleCapped: InternalSearchHit[] = [];
    for (const code of SEARCH_MODULE_GROUP_ORDER) {
      const hits = byModule.get(code);
      if (!hits?.length) continue;
      hits.sort((a, b) => b.score - a.score);
      perModuleCapped.push(...hits.slice(0, SEARCH_MAX_PER_MODULE));
    }

    perModuleCapped.sort((a, b) => b.score - a.score);
    const globallyCapped = perModuleCapped.slice(0, SEARCH_MAX_GLOBAL);

    const groupMap = new Map<string, InternalSearchHit[]>();
    for (const h of globallyCapped) {
      const arr = groupMap.get(h.moduleCode) ?? [];
      arr.push(h);
      groupMap.set(h.moduleCode, arr);
    }

    const groupOrder = new Map(
      SEARCH_MODULE_GROUP_ORDER.map((c, i) => [c, i] as const),
    );

    const groups: GlobalSearchResponseDto['groups'] = [];
    for (const [moduleCode, hits] of groupMap) {
      if (!hits.length) continue;
      const meta = hits[0]!;
      hits.sort((a, b) => b.score - a.score);
      groups.push({
        moduleCode,
        moduleLabel: meta.moduleLabel,
        type: meta.groupType,
        icon: meta.groupIcon,
        total: hits.length,
        results: hits.map((r) => ({
          title: r.title,
          subtitle: r.subtitle,
          route: r.route,
          score: r.score,
          type: r.hitType,
        })),
      });
    }

    groups.sort((a, b) => {
      const maxA = Math.max(...a.results.map((r) => r.score), 0);
      const maxB = Math.max(...b.results.map((r) => r.score), 0);
      if (maxB !== maxA) return maxB - maxA;
      const oa = groupOrder.get(a.moduleCode as (typeof SEARCH_MODULE_GROUP_ORDER)[number]) ?? 999;
      const ob = groupOrder.get(b.moduleCode as (typeof SEARCH_MODULE_GROUP_ORDER)[number]) ?? 999;
      if (oa !== ob) return oa - ob;
      return b.total - a.total;
    });

    const total = groups.reduce((s, g) => s + g.results.length, 0);
    return { groups, total };
  }
}
