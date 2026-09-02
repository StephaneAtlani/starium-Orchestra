import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BudgetImportJobStatus,
  BudgetImportMode,
  BudgetImportSourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveCreatedByLabel } from '../../common/utils/user-display-label';
import { ListBudgetImportJobsQueryDto } from './dto/list-import-jobs.query.dto';
import type { BudgetImportJobSummary } from './types/mapping.types';

export interface BudgetImportJobListItem {
  id: string;
  budgetId: string;
  budgetLabel: string;
  exerciseLabel: string | null;
  fileName: string;
  sourceType: BudgetImportSourceType;
  status: BudgetImportJobStatus;
  importMode: BudgetImportMode;
  mappingId: string | null;
  mappingName: string | null;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  summary: BudgetImportJobSummary | null;
  createdByLabel: string | null;
  createdAt: Date;
}

export interface ListBudgetImportJobsResult {
  items: BudgetImportJobListItem[];
  total: number;
  limit: number;
  offset: number;
}

const jobInclude = {
  budget: {
    select: {
      id: true,
      name: true,
      code: true,
      exercise: { select: { name: true, code: true } },
    },
  },
  mapping: { select: { id: true, name: true } },
  createdBy: {
    select: { firstName: true, lastName: true, email: true },
  },
} satisfies Prisma.BudgetImportJobInclude;

type JobWithRelations = Prisma.BudgetImportJobGetPayload<{
  include: typeof jobInclude;
}>;

function budgetLabelOf(budget: JobWithRelations['budget']): string {
  const name = budget.name?.trim();
  const code = budget.code?.trim();
  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;
  return 'Budget';
}

function exerciseLabelOf(budget: JobWithRelations['budget']): string | null {
  const ex = budget.exercise;
  if (!ex) return null;
  const name = ex.name?.trim();
  const code = ex.code?.trim();
  if (name && code) return `${name} (${code})`;
  return name || code || null;
}

function toListItem(job: JobWithRelations): BudgetImportJobListItem {
  return {
    id: job.id,
    budgetId: job.budgetId,
    budgetLabel: budgetLabelOf(job.budget),
    exerciseLabel: exerciseLabelOf(job.budget),
    fileName: job.fileName,
    sourceType: job.sourceType,
    status: job.status,
    importMode: job.importMode,
    mappingId: job.mappingId,
    mappingName: job.mapping?.name ?? null,
    totalRows: job.totalRows,
    createdRows: job.createdRows,
    updatedRows: job.updatedRows,
    skippedRows: job.skippedRows,
    errorRows: job.errorRows,
    summary: (job.summary as BudgetImportJobSummary | null) ?? null,
    createdByLabel: resolveCreatedByLabel(job.createdBy),
    createdAt: job.createdAt,
  };
}

@Injectable()
export class BudgetImportJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    clientId: string,
    query: ListBudgetImportJobsQueryDto,
  ): Promise<ListBudgetImportJobsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.BudgetImportJobWhereInput = { clientId };
    if (query.budgetId) where.budgetId = query.budgetId;
    if (query.status) where.status = query.status;
    if (query.mappingId) where.mappingId = query.mappingId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [rows, total] = await Promise.all([
      this.prisma.budgetImportJob.findMany({
        where,
        include: jobInclude,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.budgetImportJob.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      total,
      limit,
      offset,
    };
  }

  async getById(
    clientId: string,
    id: string,
  ): Promise<BudgetImportJobListItem> {
    const job = await this.prisma.budgetImportJob.findFirst({
      where: { id, clientId },
      include: jobInclude,
    });
    if (!job) {
      throw new NotFoundException('Import introuvable');
    }
    return toListItem(job);
  }
}
