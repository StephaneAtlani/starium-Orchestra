import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BUDGET_DECISION_HISTORY_ACTIONS,
  BUDGET_DECISION_HISTORY_ACTION_SET,
} from './budget-audit.constants';
import { buildDecisionHistorySummary } from './budget-decision-history-summary';
import type {
  DecisionHistoryItemDto,
  ListBudgetDecisionHistoryQueryDto,
  ListBudgetDecisionHistoryResponseDto,
} from './budget-decision-history.dto';

function actorDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

@Injectable()
export class BudgetDecisionHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    clientId: string,
    budgetId: string,
    query: ListBudgetDecisionHistoryQueryDto,
  ): Promise<ListBudgetDecisionHistoryResponseDto> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
      select: { id: true, name: true, code: true },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const budgetName = budget.name;
    const budgetCode = budget.code ?? null;

    const actionSet = this.resolveActionFilter(query.actions);
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const createdAt: Prisma.DateTimeFilter | undefined =
      query.from || query.to
        ? {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          }
        : undefined;

    const wantsRealloc = actionSet.has('budget.reallocated');
    const reallocResourceIds = wantsRealloc
      ? await this.reallocationAuditResourceIds(clientId, budgetId, query)
      : [];

    let where: Prisma.AuditLogWhereInput;

    if (query.budgetLineId) {
      const line = await this.prisma.budgetLine.findFirst({
        where: { id: query.budgetLineId, budgetId, clientId },
        select: { id: true },
      });
      if (!line) {
        throw new NotFoundException('Budget line not found for this budget');
      }
      const or: Prisma.AuditLogWhereInput[] = [
        {
          resourceType: 'budget_line',
          resourceId: query.budgetLineId,
          action: { in: [...actionSet] },
        },
      ];
      if (reallocResourceIds.length > 0) {
        or.push({
          resourceType: 'budget_reallocation',
          resourceId: { in: reallocResourceIds },
          action: { in: [...actionSet] },
        });
      }
      where = {
        clientId,
        action: { in: [...actionSet] },
        OR: or,
        ...(createdAt ? { createdAt } : {}),
      };
    } else if (query.envelopeId) {
      const envelope = await this.prisma.budgetEnvelope.findFirst({
        where: { id: query.envelopeId, budgetId, clientId },
        select: { id: true },
      });
      if (!envelope) {
        throw new NotFoundException('Budget envelope not found for this budget');
      }
      const linesInEnv = await this.prisma.budgetLine.findMany({
        where: { budgetId, clientId, envelopeId: query.envelopeId },
        select: { id: true },
      });
      const lineIds = linesInEnv.map((l) => l.id);
      const or: Prisma.AuditLogWhereInput[] = [
        {
          resourceType: 'budget_envelope',
          resourceId: query.envelopeId,
          action: { in: [...actionSet] },
        },
      ];
      if (lineIds.length > 0) {
        or.push({
          resourceType: 'budget_line',
          resourceId: { in: lineIds },
          action: { in: [...actionSet] },
        });
      }
      if (reallocResourceIds.length > 0) {
        or.push({
          resourceType: 'budget_reallocation',
          resourceId: { in: reallocResourceIds },
          action: { in: [...actionSet] },
        });
      }
      where = {
        clientId,
        action: { in: [...actionSet] },
        OR: or,
        ...(createdAt ? { createdAt } : {}),
      };
    } else {
      const [envelopeRows, lineRows] = await Promise.all([
        this.prisma.budgetEnvelope.findMany({
          where: { budgetId, clientId },
          select: { id: true },
        }),
        this.prisma.budgetLine.findMany({
          where: { budgetId, clientId },
          select: { id: true },
        }),
      ]);
      const envelopeIds = envelopeRows.map((e) => e.id);
      const lineIds = lineRows.map((l) => l.id);

      const or: Prisma.AuditLogWhereInput[] = [
        {
          resourceType: 'budget',
          resourceId: budgetId,
          action: { in: [...actionSet] },
        },
      ];
      if (envelopeIds.length > 0) {
        or.push({
          resourceType: 'budget_envelope',
          resourceId: { in: envelopeIds },
          action: { in: [...actionSet] },
        });
      }
      if (lineIds.length > 0) {
        or.push({
          resourceType: 'budget_line',
          resourceId: { in: lineIds },
          action: { in: [...actionSet] },
        });
      }
      if (reallocResourceIds.length > 0) {
        or.push({
          resourceType: 'budget_reallocation',
          resourceId: { in: reallocResourceIds },
          action: { in: [...actionSet] },
        });
      }
      where = {
        clientId,
        action: { in: [...actionSet] },
        OR: or,
        ...(createdAt ? { createdAt } : {}),
      };
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    if (logs.length === 0) {
      return {
        items: [],
        total,
        limit,
        offset,
      };
    }

    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const lineResourceIds = logs
      .filter((l) => l.resourceType === 'budget_line' && l.resourceId)
      .map((l) => l.resourceId as string);
    const reallocLineIdsFromLogs: string[] = [];
    for (const log of logs) {
      if (log.resourceType === 'budget_reallocation' && log.newValue) {
        const nv = log.newValue as Record<string, unknown>;
        if (typeof nv.sourceLineId === 'string') reallocLineIdsFromLogs.push(nv.sourceLineId);
        if (typeof nv.targetLineId === 'string') reallocLineIdsFromLogs.push(nv.targetLineId);
      }
    }
    const allLineIdsForFetch = [...new Set([...lineResourceIds, ...reallocLineIdsFromLogs])];

    const envelopeResourceIds = logs
      .filter((l) => l.resourceType === 'budget_envelope' && l.resourceId)
      .map((l) => l.resourceId as string);

    const [lines, envelopes] = await Promise.all([
      allLineIdsForFetch.length
        ? this.prisma.budgetLine.findMany({
            where: {
              id: { in: allLineIdsForFetch },
              clientId,
              budgetId,
            },
            select: {
              id: true,
              name: true,
              code: true,
              envelopeId: true,
            },
          })
        : [],
      envelopeResourceIds.length
        ? this.prisma.budgetEnvelope.findMany({
            where: {
              id: { in: [...new Set(envelopeResourceIds)] },
              clientId,
              budgetId,
            },
            select: { id: true, name: true, code: true },
          })
        : [],
    ]);

    const lineById = new Map(lines.map((l) => [l.id, l]));
    const envelopeById = new Map(envelopes.map((e) => [e.id, e]));

    const envelopeIdsForLines = lines.map((l) => l.envelopeId);
    const extraEnvelopes =
      envelopeIdsForLines.length > 0
        ? await this.prisma.budgetEnvelope.findMany({
            where: {
              id: { in: [...new Set(envelopeIdsForLines)] },
              clientId,
              budgetId,
            },
            select: { id: true, name: true, code: true },
          })
        : [];
    for (const e of extraEnvelopes) {
      envelopeById.set(e.id, e);
    }

    const items: DecisionHistoryItemDto[] = logs.map((log) => {
      const actorUser = log.userId ? userById.get(log.userId) : null;
      const actor = actorUser
        ? {
            id: actorUser.id,
            displayName: actorDisplayName(actorUser),
          }
        : null;

      let envelopeCtx: { id: string; name: string; code: string } | null = null;
      let lineCtx: { id: string; name: string; code: string } | null = null;

      if (log.resourceType === 'budget_line' && log.resourceId) {
        const line = lineById.get(log.resourceId);
        if (line) {
          lineCtx = {
            id: line.id,
            name: line.name,
            code: line.code,
          };
          const env = envelopeById.get(line.envelopeId);
          if (env) {
            envelopeCtx = { id: env.id, name: env.name, code: env.code };
          }
        }
      } else if (log.resourceType === 'budget_envelope' && log.resourceId) {
        const env = envelopeById.get(log.resourceId);
        if (env) {
          envelopeCtx = { id: env.id, name: env.name, code: env.code };
        }
      } else if (log.resourceType === 'budget_reallocation' && log.newValue) {
        const nv = log.newValue as Record<string, unknown>;
        const tgtId = typeof nv.targetLineId === 'string' ? nv.targetLineId : null;
        if (tgtId) {
          const line = lineById.get(tgtId);
          if (line) {
            lineCtx = { id: line.id, name: line.name, code: line.code };
            const env = envelopeById.get(line.envelopeId);
            if (env) {
              envelopeCtx = { id: env.id, name: env.name, code: env.code };
            }
          }
        }
      }

      const nvForSummary = log.newValue as Record<string, unknown> | null;
      let reallocationCtx: {
        sourceLineName: string;
        targetLineName: string;
        amount: number;
        currency: string;
        reason: string | null;
      } | undefined;
      if (log.resourceType === 'budget_reallocation' && nvForSummary) {
        const srcId = nvForSummary.sourceLineId as string | undefined;
        const tgtId = nvForSummary.targetLineId as string | undefined;
        const src = srcId ? lineById.get(srcId) : undefined;
        const tgt = tgtId ? lineById.get(tgtId) : undefined;
        const amountRaw = nvForSummary.amount;
        const amount =
          typeof amountRaw === 'number'
            ? amountRaw
            : typeof amountRaw === 'string'
              ? Number(amountRaw)
              : NaN;
        reallocationCtx = {
          sourceLineName: src?.name ?? 'Ligne source',
          targetLineName: tgt?.name ?? 'Ligne cible',
          amount: Number.isFinite(amount) ? amount : 0,
          currency: typeof nvForSummary.currency === 'string' ? nvForSummary.currency : 'EUR',
          reason: typeof nvForSummary.reason === 'string' ? nvForSummary.reason : null,
        };
      }

      const summary = buildDecisionHistorySummary(
        log.action,
        log.oldValue,
        log.newValue,
        {
          budgetName,
          envelopeName: envelopeCtx?.name ?? null,
          lineName: lineCtx?.name ?? null,
          ...(reallocationCtx ? { reallocation: reallocationCtx } : {}),
        },
      );

      const nv = log.newValue as Record<string, unknown> | null;
      const statusChangeComment =
        (log.action === 'budget.status.changed' ||
          log.action === 'budget_line.status.changed') &&
        typeof nv?.comment === 'string' &&
        nv.comment.trim()
          ? nv.comment.trim()
          : null;

      const details =
        log.oldValue !== null || log.newValue !== null
          ? {
              oldValue: log.oldValue as Record<string, unknown> | null,
              newValue: log.newValue as Record<string, unknown> | null,
            }
          : null;

      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        action: log.action,
        summary,
        statusChangeComment,
        actor,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        context: {
          budget: { id: budget.id, name: budgetName, code: budgetCode },
          envelope: envelopeCtx,
          line: lineCtx,
        },
        details,
      };
    });

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  /** IDs d’audit `budget_reallocation` pertinents pour le périmètre (ligne, enveloppe ou budget entier). */
  private async reallocationAuditResourceIds(
    clientId: string,
    budgetId: string,
    query: ListBudgetDecisionHistoryQueryDto,
  ): Promise<string[]> {
    const base = { budgetId, clientId };
    if (query.budgetLineId) {
      const rows = await this.prisma.budgetReallocation.findMany({
        where: {
          ...base,
          OR: [{ sourceLineId: query.budgetLineId }, { targetLineId: query.budgetLineId }],
        },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    }
    if (query.envelopeId) {
      const linesInEnv = await this.prisma.budgetLine.findMany({
        where: { budgetId, clientId, envelopeId: query.envelopeId },
        select: { id: true },
      });
      const inEnv = new Set(linesInEnv.map((l) => l.id));
      if (inEnv.size === 0) return [];
      const all = await this.prisma.budgetReallocation.findMany({
        where: base,
        select: { id: true, sourceLineId: true, targetLineId: true },
      });
      return all
        .filter((r) => inEnv.has(r.sourceLineId) && inEnv.has(r.targetLineId))
        .map((r) => r.id);
    }
    const rows = await this.prisma.budgetReallocation.findMany({
      where: base,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private resolveActionFilter(requested?: string[]): Set<string> {
    if (!requested?.length) {
      return new Set(BUDGET_DECISION_HISTORY_ACTIONS);
    }
    const filtered = requested.filter((a) => BUDGET_DECISION_HISTORY_ACTION_SET.has(a));
    if (filtered.length === 0) {
      return new Set(BUDGET_DECISION_HISTORY_ACTIONS);
    }
    return new Set(filtered);
  }
}
