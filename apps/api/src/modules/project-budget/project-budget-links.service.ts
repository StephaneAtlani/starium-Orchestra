/**
 * RFC-PROJ-010 — liaisons projet ↔ lignes budgétaires.
 *
 * Taxonomie des erreurs :
 * - BadRequestException : validation / invariant (mélange de types, somme % > 100, etc.)
 * - ConflictException : budget ou exercice fermé, ligne non ACTIVE, suppression refusée
 *   (résidu incohérent), doublon (unicité projectId + budgetLineId)
 * - NotFoundException : ressource hors scope client
 *
 * Convention Financial Core (RFC-PROJ-011) : sur les futurs `FinancialEvent`,
 * `sourceType = PROJECT`, `sourceId = projectId`. Ne pas créer d'événement financier ici.
 *
 * Contention : en forte volumétrie, envisager SELECT FOR UPDATE sur `Project` ou une file
 * par projet — hors scope MVP.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { fromDecimal } from '../budget-management/helpers/decimal.helper';
import {
  BudgetExerciseStatus,
  BudgetLineStatus,
  BudgetStatus,
  Prisma,
  ProjectBudgetAllocationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../projects/project-audit.constants';
import { ProjectsService } from '../projects/projects.service';
import { CreateProjectBudgetLinkDto } from './dto/create-project-budget-link.dto';
import { ListProjectBudgetLinksQueryDto } from './dto/list-project-budget-links.query.dto';
import { UpdateProjectBudgetLinkDto } from './dto/update-project-budget-link.dto';

const PERCENTAGE_SUM_EPSILON = new Prisma.Decimal('0.01');

export type ProjectBudgetLinkInvariantRow = {
  allocationType: ProjectBudgetAllocationType;
  percentage: Prisma.Decimal | null;
  amount: Prisma.Decimal | null;
};

@Injectable()
export class ProjectBudgetLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
  ) {}

  /**
   * Invariant global : 0 lien = valide ; sinon un seul type, règles FULL / PERCENTAGE / FIXED.
   */
  validateProjectLinksInvariant(links: ProjectBudgetLinkInvariantRow[]): void {
    if (links.length === 0) {
      return;
    }

    const types = new Set(links.map((l) => l.allocationType));
    if (types.size !== 1) {
      throw new BadRequestException(
        'Un seul mode d’allocation par projet (FULL, PERCENTAGE ou FIXED)',
      );
    }

    const mode = links[0]!.allocationType;

    if (mode === ProjectBudgetAllocationType.FULL) {
      if (links.length > 1) {
        throw new BadRequestException('Au plus un lien FULL par projet');
      }
      const row = links[0]!;
      if (row.percentage != null || row.amount != null) {
        throw new BadRequestException(
          'Un lien FULL ne doit pas avoir de pourcentage ni de montant',
        );
      }
      return;
    }

    if (mode === ProjectBudgetAllocationType.PERCENTAGE) {
      for (const l of links) {
        if (l.percentage == null) {
          throw new BadRequestException(
            'Pourcentage requis pour chaque lien en mode PERCENTAGE',
          );
        }
      }
      const sum = links.reduce(
        (acc, l) => acc.plus(l.percentage!),
        new Prisma.Decimal(0),
      );
      const cap = new Prisma.Decimal(100).plus(PERCENTAGE_SUM_EPSILON);
      if (sum.gt(cap)) {
        throw new BadRequestException(
          'La somme des pourcentages ne peut pas dépasser 100',
        );
      }
      return;
    }

    if (mode === ProjectBudgetAllocationType.FIXED) {
      for (const l of links) {
        if (l.amount == null || l.amount.lte(0)) {
          throw new BadRequestException(
            'Chaque montant FIXED doit être strictement positif',
          );
        }
      }
    }
  }

  private assertCreateDtoShape(dto: CreateProjectBudgetLinkDto): void {
    if (dto.allocationType === ProjectBudgetAllocationType.FULL) {
      if (dto.percentage != null || dto.amount != null) {
        throw new BadRequestException(
          'Un lien FULL ne doit pas inclure de pourcentage ni de montant',
        );
      }
      return;
    }
    if (dto.allocationType === ProjectBudgetAllocationType.PERCENTAGE) {
      if (dto.percentage == null) {
        throw new BadRequestException('Le pourcentage est requis en mode PERCENTAGE');
      }
      if (dto.amount != null) {
        throw new BadRequestException('Ne pas envoyer de montant en mode PERCENTAGE');
      }
      return;
    }
    if (dto.allocationType === ProjectBudgetAllocationType.FIXED) {
      if (dto.amount == null) {
        throw new BadRequestException('Le montant est requis en mode FIXED');
      }
      if (dto.percentage != null) {
        throw new BadRequestException('Ne pas envoyer de pourcentage en mode FIXED');
      }
    }
  }

  /**
   * Répartition des montants FIXED en % de la somme des montants (pas des lignes budgétaires).
   * Aligné sur @db.Decimal(5,2) : 2 décimales, dernière ligne = 100 − somme des arrondis (somme ≈ 100).
   */
  private fixedAmountsToPercentages(
    amounts: Prisma.Decimal[],
  ): Prisma.Decimal[] {
    const sum = amounts.reduce(
      (acc, x) => acc.plus(x),
      new Prisma.Decimal(0),
    );
    if (sum.lte(0)) {
      throw new BadRequestException(
        'Impossible de passer en pourcentages : somme des montants nulle ou négative.',
      );
    }
    const n = amounts.length;
    const pcts: Prisma.Decimal[] = [];
    let accPct = new Prisma.Decimal(0);
    const dp = 2;
    for (let i = 0; i < n - 1; i++) {
      const raw = amounts[i]!.div(sum).times(100);
      const rounded = raw.toDecimalPlaces(dp, Prisma.Decimal.ROUND_HALF_UP);
      pcts.push(rounded);
      accPct = accPct.plus(rounded);
    }
    const last = new Prisma.Decimal(100)
      .minus(accPct)
      .toDecimalPlaces(dp, Prisma.Decimal.ROUND_HALF_UP);
    pcts.push(last);
    return pcts;
  }

  /**
   * Calcule l’état cible du lien après PATCH (fusion dto + existant).
   * Changement de mode avec plusieurs liens : traité par `updateAllocationModeForAllLinks` avant appel.
   */
  private computeNextLinkState(
    existing: {
      budgetLineId: string;
      allocationType: ProjectBudgetAllocationType;
      percentage: Prisma.Decimal | null;
      amount: Prisma.Decimal | null;
    },
    dto: UpdateProjectBudgetLinkDto,
    linkCount: number,
  ): {
    budgetLineId: string;
    allocationType: ProjectBudgetAllocationType;
    percentage: Prisma.Decimal | null;
    amount: Prisma.Decimal | null;
  } {
    const budgetLineId = dto.budgetLineId ?? existing.budgetLineId;

    let allocationType = existing.allocationType;
    if (dto.allocationType !== undefined) {
      if (dto.allocationType !== existing.allocationType) {
        if (linkCount > 1) {
          throw new BadRequestException(
            'Le mode d’allocation ne peut pas être modifié tant qu’il existe plusieurs liens sur ce projet.',
          );
        }
        allocationType = dto.allocationType;
      } else {
        allocationType = dto.allocationType;
      }
    }

    if (allocationType === ProjectBudgetAllocationType.FULL) {
      if (dto.percentage != null || dto.amount != null) {
        throw new BadRequestException(
          'Un lien FULL ne doit pas inclure de pourcentage ni de montant',
        );
      }
      return {
        budgetLineId,
        allocationType,
        percentage: null,
        amount: null,
      };
    }

    if (allocationType === ProjectBudgetAllocationType.PERCENTAGE) {
      const pct =
        dto.percentage !== undefined
          ? new Prisma.Decimal(dto.percentage)
          : existing.allocationType === ProjectBudgetAllocationType.PERCENTAGE &&
              existing.percentage != null
            ? existing.percentage
            : null;
      if (pct == null) {
        throw new BadRequestException('Le pourcentage est requis en mode PERCENTAGE');
      }
      if (dto.amount != null) {
        throw new BadRequestException('Ne pas envoyer de montant en mode PERCENTAGE');
      }
      return {
        budgetLineId,
        allocationType,
        percentage: pct,
        amount: null,
      };
    }

    const amt =
      dto.amount !== undefined
        ? new Prisma.Decimal(dto.amount)
        : existing.allocationType === ProjectBudgetAllocationType.FIXED &&
            existing.amount != null
          ? existing.amount
          : null;
    if (amt == null) {
      throw new BadRequestException('Le montant est requis en mode FIXED');
    }
    if (dto.percentage != null) {
      throw new BadRequestException('Ne pas envoyer de pourcentage en mode FIXED');
    }
    return {
      budgetLineId,
      allocationType,
      percentage: null,
      amount: amt,
    };
  }

  private candidateFromDto(
    dto: CreateProjectBudgetLinkDto,
  ): ProjectBudgetLinkInvariantRow {
    return {
      allocationType: dto.allocationType,
      percentage:
        dto.allocationType === ProjectBudgetAllocationType.PERCENTAGE
          ? new Prisma.Decimal(dto.percentage!)
          : null,
      amount:
        dto.allocationType === ProjectBudgetAllocationType.FIXED
          ? new Prisma.Decimal(dto.amount!)
          : null,
    };
  }

  private rowFromEntity(row: {
    allocationType: ProjectBudgetAllocationType;
    percentage: Prisma.Decimal | null;
    amount: Prisma.Decimal | null;
  }): ProjectBudgetLinkInvariantRow {
    return {
      allocationType: row.allocationType,
      percentage: row.percentage,
      amount: row.amount,
    };
  }

  private async assertBudgetLineLinkable(
    clientId: string,
    budgetLineId: string,
  ): Promise<void> {
    const line = await this.prisma.budgetLine.findFirst({
      where: { id: budgetLineId, clientId },
      include: {
        budget: { include: { exercise: true } },
      },
    });
    if (!line) {
      throw new NotFoundException('Budget line not found');
    }
    if (line.status !== BudgetLineStatus.ACTIVE) {
      throw new ConflictException(
        'La ligne budgétaire doit être ACTIVE pour créer un lien',
      );
    }
    if (
      line.budget.status === BudgetStatus.LOCKED ||
      line.budget.status === BudgetStatus.ARCHIVED
    ) {
      throw new ConflictException(
        'Impossible de lier un projet : le budget est verrouillé ou archivé',
      );
    }
    const ex = line.budget.exercise;
    if (
      ex.status === BudgetExerciseStatus.CLOSED ||
      ex.status === BudgetExerciseStatus.ARCHIVED
    ) {
      throw new ConflictException(
        'Impossible de lier un projet : l’exercice budgétaire est clos ou archivé',
      );
    }
  }

  private serializeLink(
    link: {
      id: string;
      projectId: string;
      budgetLineId: string;
      allocationType: ProjectBudgetAllocationType;
      percentage: Prisma.Decimal | null;
      amount: Prisma.Decimal | null;
      createdAt: Date;
    },
    budgetLine: {
      id: string;
      code: string;
      name: string;
      budgetId: string;
      envelopeId: string;
      status: BudgetLineStatus;
      committedAmount: Prisma.Decimal | null;
      consumedAmount: Prisma.Decimal | null;
      expenseType: string;
    },
  ) {
    return {
      id: link.id,
      projectId: link.projectId,
      budgetLineId: link.budgetLineId,
      allocationType: link.allocationType,
      percentage:
        link.percentage != null
          ? new Prisma.Decimal(link.percentage).toDecimalPlaces(2).toString()
          : null,
      amount:
        link.amount != null
          ? new Prisma.Decimal(link.amount).toDecimalPlaces(2).toString()
          : null,
      createdAt: link.createdAt.toISOString(),
      budgetLine: {
        id: budgetLine.id,
        code: budgetLine.code,
        name: budgetLine.name,
        budgetId: budgetLine.budgetId,
        envelopeId: budgetLine.envelopeId,
        status: budgetLine.status,
        committedAmount: fromDecimal(budgetLine.committedAmount),
        consumedAmount: fromDecimal(budgetLine.consumedAmount),
        expenseType: budgetLine.expenseType,
      },
    };
  }

  private auditPayload(
    link: {
      projectId: string;
      budgetLineId: string;
      allocationType: ProjectBudgetAllocationType;
      percentage: Prisma.Decimal | null;
      amount: Prisma.Decimal | null;
    },
  ) {
    return {
      projectId: link.projectId,
      budgetLineId: link.budgetLineId,
      allocationType: link.allocationType,
      percentage: link.percentage?.toString() ?? null,
      amount: link.amount?.toString() ?? null,
    };
  }

  async list(
    clientId: string,
    projectId: string,
    query: ListProjectBudgetLinksQueryDto,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);

    const limit = Math.min(query.limit ?? 20, 100);
    const offset = query.offset ?? 0;

    const where = { clientId, projectId };

    const [total, rows] = await Promise.all([
      this.prisma.projectBudgetLink.count({ where }),
      this.prisma.projectBudgetLink.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
        include: {
          budgetLine: {
            select: {
              id: true,
              code: true,
              name: true,
              budgetId: true,
              envelopeId: true,
              status: true,
              committedAmount: true,
              consumedAmount: true,
              expenseType: true,
            },
          },
        },
      }),
    ]);

    return {
      items: rows.map((r) => this.serializeLink(r, r.budgetLine)),
      total,
      limit,
      offset,
    };
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectBudgetLinkDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    this.assertCreateDtoShape(dto);
    await this.assertBudgetLineLinkable(clientId, dto.budgetLineId);

    const candidate = this.candidateFromDto(dto);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.projectBudgetLink.findMany({
          where: { clientId, projectId },
        });

        const merged = [
          ...existing.map((e) => this.rowFromEntity(e)),
          candidate,
        ];
        this.validateProjectLinksInvariant(merged);

        return tx.projectBudgetLink.create({
          data: {
            clientId,
            projectId,
            budgetLineId: dto.budgetLineId,
            allocationType: dto.allocationType,
            percentage: candidate.percentage,
            amount: candidate.amount,
          },
          include: {
            budgetLine: {
              select: {
                id: true,
                code: true,
                name: true,
                budgetId: true,
                envelopeId: true,
                status: true,
                committedAmount: true,
                consumedAmount: true,
                expenseType: true,
              },
            },
          },
        });
      });

      const meta = {
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      };

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_BUDGET_LINK_CREATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_BUDGET_LINK,
        resourceId: created.id,
        newValue: this.auditPayload(created),
        ...meta,
      });

      return this.serializeLink(created, created.budgetLine);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Un lien existe déjà pour cette combinaison projet / ligne budgétaire',
        );
      }
      throw err;
    }
  }

  async remove(
    clientId: string,
    linkId: string,
    context?: AuditContext,
  ): Promise<void> {
    const existingLink = await this.prisma.projectBudgetLink.findFirst({
      where: { id: linkId, clientId },
    });
    if (!existingLink) {
      throw new NotFoundException('Project budget link not found');
    }

    const projectId = existingLink.projectId;

    const snapshot = this.auditPayload(existingLink);

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.projectBudgetLink.findMany({
        where: { clientId, projectId },
      });

      const remaining = current.filter((l) => l.id !== linkId);
      try {
        this.validateProjectLinksInvariant(
          remaining.map((e) => this.rowFromEntity(e)),
        );
      } catch (e) {
        if (e instanceof BadRequestException) {
          throw new ConflictException(
            'Suppression impossible : les liens restants ne respecteraient pas les règles d’allocation',
          );
        }
        throw e;
      }

      await tx.projectBudgetLink.delete({
        where: { id: linkId },
      });
    });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_BUDGET_LINK_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_BUDGET_LINK,
      resourceId: linkId,
      oldValue: snapshot,
      ...meta,
    });
  }

  /**
   * Plusieurs liens : changement de mode global (PERCENTAGE ↔ FIXED) avec conversion des valeurs.
   * FULL interdit si plus d’un lien. Ne pas combiner avec un changement de ligne sur ce PATCH.
   */
  private async updateAllocationModeForAllLinks(
    clientId: string,
    linkId: string,
    existingLink: {
      id: string;
      projectId: string;
      budgetLineId: string;
      allocationType: ProjectBudgetAllocationType;
      percentage: Prisma.Decimal | null;
      amount: Prisma.Decimal | null;
      budgetLine: {
        id: string;
        code: string;
        name: string;
        budgetId: string;
        envelopeId: string;
        status: BudgetLineStatus;
      };
    },
    dto: UpdateProjectBudgetLinkDto,
    context?: AuditContext,
  ) {
    const newType = dto.allocationType!;
    const projectId = existingLink.projectId;

    if (newType === ProjectBudgetAllocationType.FULL) {
      throw new BadRequestException(
        'Le mode « 100 % sur la ligne » n’est possible qu’avec un seul lien budgétaire.',
      );
    }

    if (
      dto.budgetLineId != null &&
      dto.budgetLineId !== existingLink.budgetLineId
    ) {
      throw new BadRequestException(
        'Enregistrez d’abord le changement de ligne budgétaire, puis le mode d’allocation.',
      );
    }

    const links = await this.prisma.projectBudgetLink.findMany({
      where: { clientId, projectId },
      orderBy: { createdAt: 'asc' },
      include: {
        budgetLine: {
          select: {
            id: true,
            code: true,
            name: true,
            budgetId: true,
            envelopeId: true,
            status: true,
            committedAmount: true,
            consumedAmount: true,
            expenseType: true,
            initialAmount: true,
          },
        },
      },
    });

    const oldType = existingLink.allocationType;
    if (!links.every((l) => l.allocationType === oldType)) {
      throw new BadRequestException('État des liens incohérent (modes mélangés).');
    }

    if (oldType === newType) {
      throw new BadRequestException('Aucun changement de mode.');
    }

    if (oldType === ProjectBudgetAllocationType.FULL) {
      throw new BadRequestException(
        'Changement de mode depuis FULL : un seul lien attendu.',
      );
    }

    const snapshots = new Map(
      links.map((l) => [l.id, this.auditPayload(l)] as const),
    );

    const rowsForInvariant: ProjectBudgetLinkInvariantRow[] = [];

    if (
      oldType === ProjectBudgetAllocationType.PERCENTAGE &&
      newType === ProjectBudgetAllocationType.FIXED
    ) {
      for (const row of links) {
        const pct = row.percentage!;
        const rev = row.budgetLine.initialAmount;
        let amt = pct.div(100).times(rev);
        if (amt.lte(0)) {
          amt = new Prisma.Decimal('0.01');
        } else {
          amt = amt.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        }
        rowsForInvariant.push({
          allocationType: ProjectBudgetAllocationType.FIXED,
          percentage: null,
          amount: amt,
        });
      }
    } else if (
      oldType === ProjectBudgetAllocationType.FIXED &&
      newType === ProjectBudgetAllocationType.PERCENTAGE
    ) {
      const amounts = links.map((l) => l.amount!);
      const pcts = this.fixedAmountsToPercentages(amounts);
      for (let i = 0; i < links.length; i++) {
        rowsForInvariant.push({
          allocationType: ProjectBudgetAllocationType.PERCENTAGE,
          percentage: pcts[i]!,
          amount: null,
        });
      }
    } else {
      throw new BadRequestException(
        'Changement de mode non pris en charge pour cette combinaison.',
      );
    }

    this.validateProjectLinksInvariant(rowsForInvariant);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < links.length; i++) {
          const row = links[i]!;
          const inv = rowsForInvariant[i]!;
          await tx.projectBudgetLink.update({
            where: { id: row.id },
            data: {
              allocationType: inv.allocationType,
              percentage: inv.percentage,
              amount: inv.amount,
            },
          });
        }

        return tx.projectBudgetLink.findFirstOrThrow({
          where: { id: linkId, clientId },
          include: {
            budgetLine: {
              select: {
                id: true,
                code: true,
                name: true,
                budgetId: true,
                envelopeId: true,
                status: true,
                committedAmount: true,
                consumedAmount: true,
                expenseType: true,
              },
            },
          },
        });
      });

      const meta = {
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      };

      for (const row of links) {
        const fresh = await this.prisma.projectBudgetLink.findFirst({
          where: { id: row.id, clientId },
        });
        if (!fresh) continue;
        await this.auditLogs.create({
          clientId,
          userId: context?.actorUserId,
          action: PROJECT_AUDIT_ACTION.PROJECT_BUDGET_LINK_UPDATED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_BUDGET_LINK,
          resourceId: row.id,
          oldValue: snapshots.get(row.id),
          newValue: this.auditPayload(fresh),
          ...meta,
        });
      }

      return this.serializeLink(updated, updated.budgetLine);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Un lien existe déjà pour cette combinaison projet / ligne budgétaire',
        );
      }
      throw err;
    }
  }

  async update(
    clientId: string,
    linkId: string,
    dto: UpdateProjectBudgetLinkDto,
    context?: AuditContext,
  ) {
    const existingLink = await this.prisma.projectBudgetLink.findFirst({
      where: { id: linkId, clientId },
      include: {
        budgetLine: {
          select: {
            id: true,
            code: true,
            name: true,
            budgetId: true,
            envelopeId: true,
            status: true,
            committedAmount: true,
            consumedAmount: true,
            expenseType: true,
          },
        },
      },
    });
    if (!existingLink) {
      throw new NotFoundException('Project budget link not found');
    }

    const allBefore = await this.prisma.projectBudgetLink.findMany({
      where: { clientId, projectId: existingLink.projectId },
    });
    const linkCount = allBefore.length;

    const wantsModeChange =
      dto.allocationType !== undefined &&
      dto.allocationType !== existingLink.allocationType;

    if (linkCount > 1 && wantsModeChange && dto.allocationType != null) {
      return this.updateAllocationModeForAllLinks(
        clientId,
        linkId,
        existingLink,
        dto,
        context,
      );
    }

    const next = this.computeNextLinkState(existingLink, dto, linkCount);

    if (next.budgetLineId !== existingLink.budgetLineId) {
      await this.assertBudgetLineLinkable(clientId, next.budgetLineId);
      const dup = allBefore.find(
        (l) =>
          l.id !== linkId &&
          l.budgetLineId === next.budgetLineId,
      );
      if (dup) {
        throw new ConflictException(
          'Un lien existe déjà pour cette combinaison projet / ligne budgétaire',
        );
      }
    }

    const snapshot = this.auditPayload(existingLink);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const all = await tx.projectBudgetLink.findMany({
          where: { clientId, projectId: existingLink.projectId },
        });

        const merged = all.map((row) => {
          if (row.id !== linkId) {
            return this.rowFromEntity(row);
          }
          return {
            allocationType: next.allocationType,
            percentage: next.percentage,
            amount: next.amount,
          };
        });
        this.validateProjectLinksInvariant(merged);

        return tx.projectBudgetLink.update({
          where: { id: linkId },
          data: {
            budgetLineId: next.budgetLineId,
            allocationType: next.allocationType,
            percentage: next.percentage,
            amount: next.amount,
          },
          include: {
            budgetLine: {
              select: {
                id: true,
                code: true,
                name: true,
                budgetId: true,
                envelopeId: true,
                status: true,
                committedAmount: true,
                consumedAmount: true,
                expenseType: true,
              },
            },
          },
        });
      });

      const meta = {
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      };

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_BUDGET_LINK_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_BUDGET_LINK,
        resourceId: linkId,
        oldValue: snapshot,
        newValue: this.auditPayload(updated),
        ...meta,
      });

      return this.serializeLink(updated, updated.budgetLine);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Un lien existe déjà pour cette combinaison projet / ligne budgétaire',
        );
      }
      throw err;
    }
  }

  /**
   * Après sélection baseline (option « intégrer le budget ») : crée des liaisons projet ↔ lignes
   * budgétaires à partir des lignes financières du scénario, en mode montants fixes (somme des
   * prévisionnels par ligne budgétaire).
   * Ne modifie rien si le projet a déjà au moins une liaison (invariants d’allocation globaux).
   */
  async syncFromScenarioBaseline(
    clientId: string,
    projectId: string,
    scenarioId: string,
    context?: AuditContext,
  ): Promise<{ createdCount: number; reason?: string }> {
    await this.projects.getProjectForScope(clientId, projectId);

    const scenario = await this.prisma.projectScenario.findFirst({
      where: { id: scenarioId, clientId, projectId },
      select: { id: true },
    });
    if (!scenario) {
      return { createdCount: 0, reason: 'scenario_not_found' };
    }

    const existing = await this.prisma.projectBudgetLink.findMany({
      where: { clientId, projectId },
      select: { id: true },
    });
    if (existing.length > 0) {
      return {
        createdCount: 0,
        reason: 'project_already_has_budget_links',
      };
    }

    const lines = await this.prisma.projectScenarioFinancialLine.findMany({
      where: { clientId, scenarioId },
      include: {
        projectBudgetLink: {
          select: { id: true, projectId: true, budgetLineId: true },
        },
      },
    });

    const byBudgetLine = new Map<string, Prisma.Decimal>();
    for (const line of lines) {
      if (line.projectBudgetLinkId != null && line.projectBudgetLink) {
        if (line.projectBudgetLink.projectId === projectId) {
          continue;
        }
        continue;
      }

      if (!line.budgetLineId) {
        continue;
      }

      const add = line.amountPlanned;
      const prev = byBudgetLine.get(line.budgetLineId) ?? new Prisma.Decimal(0);
      byBudgetLine.set(line.budgetLineId, prev.plus(add));
    }

    if (byBudgetLine.size === 0) {
      return { createdCount: 0, reason: 'no_budget_line_to_attach' };
    }

    let createdCount = 0;
    for (const [budgetLineId, totalPlanned] of byBudgetLine) {
      if (totalPlanned.lte(0)) {
        continue;
      }
      const amount = totalPlanned.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const amountNum = Number(amount.toString());
      if (!(amountNum > 0)) {
        continue;
      }

      await this.create(
        clientId,
        projectId,
        {
          budgetLineId,
          allocationType: ProjectBudgetAllocationType.FIXED,
          amount: amountNum,
        },
        context,
      );
      createdCount += 1;
    }

    return { createdCount };
  }
}
