/**
 * RFC-PROJ-010 — liaisons projet ↔ lignes budgétaires.
 *
 * Taxonomie des erreurs :
 * - BadRequestException : validation / invariant (mélange de types, somme % ≠ 100, etc.)
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
      const diff = sum.minus(new Prisma.Decimal(100)).abs();
      if (diff.gt(PERCENTAGE_SUM_EPSILON)) {
        throw new BadRequestException(
          'La somme des pourcentages doit être égale à 100',
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
      status: BudgetLineStatus;
    },
  ) {
    return {
      id: link.id,
      projectId: link.projectId,
      budgetLineId: link.budgetLineId,
      allocationType: link.allocationType,
      percentage: link.percentage?.toString() ?? null,
      amount: link.amount?.toString() ?? null,
      createdAt: link.createdAt.toISOString(),
      budgetLine: {
        id: budgetLine.id,
        code: budgetLine.code,
        name: budgetLine.name,
        budgetId: budgetLine.budgetId,
        status: budgetLine.status,
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
              status: true,
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
                status: true,
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
}
