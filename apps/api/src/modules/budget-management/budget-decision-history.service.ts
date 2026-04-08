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

    let where: Prisma.AuditLogWhereInput;

    if (query.budgetLineId) {
      const line = await this.prisma.budgetLine.findFirst({
        where: { id: query.budgetLineId, budgetId, clientId },
        select: { id: true },
      });
      if (!line) {
        throw new NotFoundException('Budget line not found for this budget');
      }
      where = {
        clientId,
        action: { in: [...actionSet] },
        resourceType: 'budget_line',
        resourceId: query.budgetLineId,
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
    const envelopeResourceIds = logs
      .filter((l) => l.resourceType === 'budget_envelope' && l.resourceId)
      .map((l) => l.resourceId as string);

    const [lines, envelopes] = await Promise.all([
      lineResourceIds.length
        ? this.prisma.budgetLine.findMany({
            where: {
              id: { in: [...new Set(lineResourceIds)] },
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
      }

      const summary = buildDecisionHistorySummary(
        log.action,
        log.oldValue,
        log.newValue,
        {
          budgetName,
          envelopeName: envelopeCtx?.name ?? null,
          lineName: lineCtx?.name ?? null,
        },
      );

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
