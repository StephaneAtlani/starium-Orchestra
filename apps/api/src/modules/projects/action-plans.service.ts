import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectTaskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActionPlanDto } from './dto/create-action-plan.dto';
import {
  ActionPlanOwnerFilter,
  ListActionPlansQueryDto,
} from './dto/list-action-plans.query.dto';
import { UpdateActionPlanDto } from './dto/update-action-plan.dto';
import { normalizeListPagination } from './lib/paginated-list.util';
import { ProjectsService } from './projects.service';

@Injectable()
export class ActionPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async getForScope(clientId: string, actionPlanId: string) {
    const plan = await this.prisma.actionPlan.findFirst({
      where: { id: actionPlanId, clientId },
    });
    if (!plan) {
      throw new NotFoundException('Action plan not found');
    }
    return plan;
  }

  async list(clientId: string, query: ListActionPlansQueryDto) {
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);
    const where: Prisma.ActionPlanWhereInput = { clientId };
    if (query.search?.trim()) {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { code: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.owner === ActionPlanOwnerFilter.ASSIGNED) {
      where.ownerUserId = { not: null };
    } else if (query.owner === ActionPlanOwnerFilter.UNASSIGNED) {
      where.ownerUserId = null;
    }
    const [items, total] = await Promise.all([
      this.prisma.actionPlan.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.actionPlan.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async getOne(clientId: string, actionPlanId: string) {
    const plan = await this.prisma.actionPlan.findFirst({
      where: { id: actionPlanId, clientId },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!plan) throw new NotFoundException('Action plan not found');
    return plan;
  }

  async create(clientId: string, dto: CreateActionPlanDto) {
    const code = dto.code.trim();
    const dup = await this.prisma.actionPlan.findFirst({
      where: { clientId, code },
      select: { id: true },
    });
    if (dup) {
      throw new BadRequestException('Un plan avec ce code existe déjà pour ce client');
    }
    if (dto.ownerUserId) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }
    return this.prisma.actionPlan.create({
      data: {
        clientId,
        title: dto.title.trim(),
        code,
        description: dto.description?.trim() ?? null,
        status: dto.status,
        priority: dto.priority,
        ownerUserId: dto.ownerUserId ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async update(clientId: string, actionPlanId: string, dto: UpdateActionPlanDto) {
    await this.getForScope(clientId, actionPlanId);
    if (dto.ownerUserId !== undefined && dto.ownerUserId) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }
    return this.prisma.actionPlan.update({
      where: { id: actionPlanId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.ownerUserId !== undefined && { ownerUserId: dto.ownerUserId }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.targetDate !== undefined && {
          targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        }),
        ...(dto.progressPercent !== undefined && {
          progressPercent: dto.progressPercent,
        }),
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * progression = DONE / tâches actives ; actives = statut ≠ CANCELLED
   */
  async recalculateProgress(clientId: string, actionPlanId: string): Promise<void> {
    const plan = await this.prisma.actionPlan.findFirst({
      where: { id: actionPlanId, clientId },
      select: { id: true },
    });
    if (!plan) return;

    const tasks = await this.prisma.projectTask.findMany({
      where: { clientId, actionPlanId },
      select: { status: true },
    });
    const active = tasks.filter((t) => t.status !== ProjectTaskStatus.CANCELLED).length;
    const done = tasks.filter((t) => t.status === ProjectTaskStatus.DONE).length;
    const progressPercent = active === 0 ? 0 : Math.round((100 * done) / active);

    await this.prisma.actionPlan.update({
      where: { id: actionPlanId },
      data: { progressPercent },
    });
  }

  async touchProgressForPlans(
    clientId: string,
    planIds: Array<string | null | undefined>,
  ): Promise<void> {
    const unique = [...new Set(planIds.filter(Boolean) as string[])];
    for (const id of unique) {
      await this.recalculateProgress(clientId, id);
    }
  }
}
