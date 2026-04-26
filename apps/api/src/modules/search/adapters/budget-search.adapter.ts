import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserClientAccessService } from '../../chatbot/user-client-access.service';
import type { SearchAdapter, SearchAdapterContext } from '../search.adapter';
import { SEARCH_ADAPTER_DB_TAKE } from '../search.constants';
import type { InternalSearchHit } from '../search.types';
import { normalizeSearchText } from '../search-normalize.util';

@Injectable()
export class BudgetSearchAdapter implements SearchAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userAccess: UserClientAccessService,
  ) {}

  async search(ctx: SearchAdapterContext): Promise<InternalSearchHit[]> {
    if (!ctx.normalizedQuery) return [];
    if (!ctx.permissionCodes.has('budgets.read')) return [];
    if (!(await this.userAccess.isModuleEnabledForClient(ctx.clientId, 'budgets'))) {
      return [];
    }

    const nq = ctx.normalizedQuery;
    const rows = await this.prisma.budget.findMany({
      where: {
        clientId: ctx.clientId,
        OR: [
          { searchText: { contains: nq, mode: 'insensitive' } },
          { name: { contains: nq, mode: 'insensitive' } },
          { code: { contains: nq, mode: 'insensitive' } },
        ],
      },
      take: SEARCH_ADAPTER_DB_TAKE,
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((b) => ({
      moduleCode: 'budgets',
      moduleLabel: 'Budgets',
      groupType: 'BUDGET',
      groupIcon: 'Wallet',
      title: b.name,
      subtitle: b.code,
      route: `/budgets/${b.id}`,
      hitType: 'BUDGET',
      score: scoreBudgetRow(b, nq),
    }));
  }
}

function scoreBudgetRow(
  b: { name: string; code: string; searchText: string | null },
  nq: string,
): number {
  const nameN = normalizeSearchText(b.name);
  const codeN = normalizeSearchText(b.code);
  let s = 0;
  if (nameN.includes(nq)) s += 100;
  if (codeN.includes(nq)) s += 80;
  if (b.searchText?.toLowerCase().includes(nq)) s += 40;
  return s;
}
