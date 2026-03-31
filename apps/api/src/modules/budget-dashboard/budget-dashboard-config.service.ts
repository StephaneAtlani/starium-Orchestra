import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BudgetDashboardWidgetType,
  Prisma,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CreateBudgetDashboardConfigDto } from './dto/create-budget-dashboard-config.dto';
import type { UpdateBudgetDashboardConfigDto } from './dto/update-budget-dashboard-config.dto';
import type { BudgetDashboardWidgetInputDto } from './dto/budget-dashboard-widget-input.dto';

const CONFIG_INCLUDE = {
  widgets: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.BudgetDashboardConfigInclude;

export type BudgetDashboardConfigWithWidgets = Prisma.BudgetDashboardConfigGetPayload<{
  include: typeof CONFIG_INCLUDE;
}>;

@Injectable()
export class BudgetDashboardConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listConfigs(clientId: string): Promise<BudgetDashboardConfigWithWidgets[]> {
    await this.ensureDefaultConfig(clientId);
    return this.prisma.budgetDashboardConfig.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
      include: CONFIG_INCLUDE,
    });
  }

  /**
   * Bootstrap idempotent : une config default avec widgets par défaut si aucune ligne.
   * Sur concurrence (P2002), relecture.
   */
  async ensureDefaultConfig(
    clientId: string,
  ): Promise<BudgetDashboardConfigWithWidgets> {
    const count = await this.prisma.budgetDashboardConfig.count({
      where: { clientId },
    });
    if (count === 0) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const created = await tx.budgetDashboardConfig.create({
            data: {
              clientId,
              name: 'Cockpit par défaut',
              isDefault: true,
              layoutConfig: { columns: 2 },
              filtersConfig: Prisma.JsonNull,
              thresholdsConfig: Prisma.JsonNull,
            },
          });
          await tx.budgetDashboardWidget.createMany({
            data: this.defaultWidgetsCreate(clientId, created.id),
          });
          return tx.budgetDashboardConfig.findUniqueOrThrow({
            where: { id: created.id },
            include: CONFIG_INCLUDE,
          });
        });
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
          const again = await this.prisma.budgetDashboardConfig.findFirst({
            where: { clientId, isDefault: true },
            include: CONFIG_INCLUDE,
          });
          if (again) return again;
        }
        throw e;
      }
    }

    let config = await this.prisma.budgetDashboardConfig.findFirst({
      where: { clientId, isDefault: true },
      include: CONFIG_INCLUDE,
    });
    if (!config) {
      config = await this.prisma.budgetDashboardConfig.findFirst({
        where: { clientId },
        orderBy: { createdAt: 'asc' },
        include: CONFIG_INCLUDE,
      });
    }
    if (!config) {
      throw new Error('Invariant: budget dashboard config manquante');
    }
    if (config.widgets.length === 0) {
      await this.prisma.budgetDashboardWidget.createMany({
        data: this.defaultWidgetsCreate(clientId, config.id),
      });
      return this.prisma.budgetDashboardConfig.findUniqueOrThrow({
        where: { id: config.id },
        include: CONFIG_INCLUDE,
      });
    }
    return config;
  }

  async getConfigByIdOrThrow(
    clientId: string,
    configId: string,
  ): Promise<BudgetDashboardConfigWithWidgets> {
    const row = await this.prisma.budgetDashboardConfig.findFirst({
      where: { id: configId, clientId },
      include: CONFIG_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Configuration cockpit introuvable');
    }
    return row;
  }

  async createConfig(
    clientId: string,
    dto: CreateBudgetDashboardConfigDto,
    actorUserId?: string,
  ): Promise<BudgetDashboardConfigWithWidgets> {
    await this.validateDefaultRefs(clientId, dto.defaultExerciseId, dto.defaultBudgetId);

    let widgetsIn: BudgetDashboardWidgetInputDto[] | undefined = dto.widgets;
    if (widgetsIn === undefined) {
      widgetsIn = this.defaultWidgetInputsFromTemplate();
    }
    if (widgetsIn.length === 0) {
      throw new BadRequestException('Au moins un widget est requis');
    }
    this.validateWidgetPositions(widgetsIn);
    for (const w of widgetsIn) {
      this.assertChartWidgetRules(w.type, w.settings);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.budgetDashboardConfig.updateMany({
          where: { clientId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const config = await tx.budgetDashboardConfig.create({
        data: {
          clientId,
          name: dto.name,
          isDefault: dto.isDefault ?? false,
          defaultExerciseId: dto.defaultExerciseId ?? null,
          defaultBudgetId: dto.defaultBudgetId ?? null,
          layoutConfig: (dto.layoutConfig ?? { columns: 2 }) as Prisma.InputJsonValue,
          filtersConfig: dto.filtersConfig === undefined ? Prisma.JsonNull : (dto.filtersConfig as Prisma.InputJsonValue),
          thresholdsConfig:
            dto.thresholdsConfig === undefined
              ? Prisma.JsonNull
              : (dto.thresholdsConfig as Prisma.InputJsonValue),
        },
      });

      await tx.budgetDashboardWidget.createMany({
        data: widgetsIn!.map((w) => ({
          clientId,
          configId: config.id,
          type: w.type,
          position: w.position,
          title: w.title,
          size: w.size,
          isActive: w.isActive,
          settings:
            w.settings === undefined
              ? Prisma.JsonNull
              : (w.settings as Prisma.InputJsonValue),
        })),
      });

      return tx.budgetDashboardConfig.findUniqueOrThrow({
        where: { id: config.id },
        include: CONFIG_INCLUDE,
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget_dashboard_config.created',
      resourceType: 'budget_dashboard_config',
      resourceId: created.id,
      newValue: { name: created.name, isDefault: created.isDefault },
    });

    return created;
  }

  async updateConfig(
    clientId: string,
    configId: string,
    dto: UpdateBudgetDashboardConfigDto,
    actorUserId?: string,
  ): Promise<BudgetDashboardConfigWithWidgets> {
    const current = await this.getConfigByIdOrThrow(clientId, configId);

    if (dto.defaultExerciseId !== undefined || dto.defaultBudgetId !== undefined) {
      await this.validateDefaultRefs(
        clientId,
        dto.defaultExerciseId === null ? undefined : dto.defaultExerciseId,
        dto.defaultBudgetId === null ? undefined : dto.defaultBudgetId,
      );
    }

    if (dto.widgets !== undefined) {
      if (dto.widgets.length === 0) {
        throw new BadRequestException('Au moins un widget est requis');
      }
      this.validateWidgetPositions(dto.widgets);
      for (const w of dto.widgets) {
        this.assertChartWidgetRules(w.type, w.settings);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.budgetDashboardConfig.updateMany({
          where: { clientId, isDefault: true, id: { not: configId } },
          data: { isDefault: false },
        });
      }

      await tx.budgetDashboardConfig.update({
        where: { id: configId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.defaultExerciseId !== undefined && {
            defaultExerciseId: dto.defaultExerciseId,
          }),
          ...(dto.defaultBudgetId !== undefined && {
            defaultBudgetId: dto.defaultBudgetId,
          }),
          ...(dto.layoutConfig !== undefined && {
            layoutConfig: dto.layoutConfig as Prisma.InputJsonValue,
          }),
          ...(dto.filtersConfig !== undefined && {
            filtersConfig:
              dto.filtersConfig === null
                ? Prisma.JsonNull
                : (dto.filtersConfig as Prisma.InputJsonValue),
          }),
          ...(dto.thresholdsConfig !== undefined && {
            thresholdsConfig:
              dto.thresholdsConfig === null
                ? Prisma.JsonNull
                : (dto.thresholdsConfig as Prisma.InputJsonValue),
          }),
        },
      });

      if (dto.widgets !== undefined) {
        for (const w of dto.widgets) {
          if (w.id) {
            const owned = current.widgets.some((x) => x.id === w.id);
            if (!owned) {
              throw new NotFoundException('Widget inconnu pour cette configuration');
            }
          }
        }
        await tx.budgetDashboardWidget.deleteMany({
          where: { clientId, configId },
        });
        await tx.budgetDashboardWidget.createMany({
          data: dto.widgets.map((w) => ({
            clientId,
            configId,
            type: w.type,
            position: w.position,
            title: w.title,
            size: w.size,
            isActive: w.isActive,
            settings:
              w.settings === undefined
                ? Prisma.JsonNull
                : (w.settings as Prisma.InputJsonValue),
          })),
        });
      }

      return tx.budgetDashboardConfig.findUniqueOrThrow({
        where: { id: configId },
        include: CONFIG_INCLUDE,
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget_dashboard_config.updated',
      resourceType: 'budget_dashboard_config',
      resourceId: configId,
      oldValue: { name: current.name },
      newValue: { name: updated.name, isDefault: updated.isDefault },
    });

    return updated;
  }

  async deleteConfig(
    clientId: string,
    configId: string,
    actorUserId?: string,
  ): Promise<void> {
    const row = await this.prisma.budgetDashboardConfig.findFirst({
      where: { id: configId, clientId },
    });
    if (!row) {
      throw new NotFoundException('Configuration cockpit introuvable');
    }
    if (row.isDefault) {
      throw new ConflictException('Impossible de supprimer la configuration par défaut');
    }
    const count = await this.prisma.budgetDashboardConfig.count({
      where: { clientId },
    });
    if (count <= 1) {
      throw new ConflictException(
        'Impossible de supprimer la dernière configuration du client',
      );
    }

    await this.prisma.budgetDashboardConfig.delete({
      where: { id: configId },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget_dashboard_config.deleted',
      resourceType: 'budget_dashboard_config',
      resourceId: configId,
      oldValue: { name: row.name },
    });
  }

  private defaultWidgetsCreate(
    clientId: string,
    configId: string,
  ): Prisma.BudgetDashboardWidgetCreateManyInput[] {
    return this.defaultWidgetInputsFromTemplate().map((w) => ({
      clientId,
      configId,
      type: w.type,
      position: w.position,
      title: w.title,
      size: w.size,
      isActive: w.isActive,
      settings:
        w.settings === undefined
          ? Prisma.JsonNull
          : (w.settings as Prisma.InputJsonValue),
    }));
  }

  private defaultWidgetInputsFromTemplate(): BudgetDashboardWidgetInputDto[] {
    return [
      {
        type: BudgetDashboardWidgetType.KPI,
        position: 0,
        title: 'Indicateurs clés',
        size: 'full',
        isActive: true,
      },
      {
        type: BudgetDashboardWidgetType.ALERT_LIST,
        position: 1,
        title: 'Synthèse alertes',
        size: 'full',
        isActive: true,
      },
      {
        type: BudgetDashboardWidgetType.ENVELOPE_LIST,
        position: 2,
        title: 'Enveloppes',
        size: 'full',
        isActive: true,
      },
      {
        type: BudgetDashboardWidgetType.LINE_LIST,
        position: 3,
        title: 'Lignes budgétaires',
        size: 'full',
        isActive: true,
      },
      {
        type: BudgetDashboardWidgetType.CHART,
        position: 4,
        title: 'Répartition Run / Build',
        size: 'full',
        isActive: true,
        settings: { chartType: 'RUN_BUILD_BREAKDOWN' },
      },
      {
        type: BudgetDashboardWidgetType.CHART,
        position: 5,
        title: 'Tendance consommation',
        size: 'full',
        isActive: true,
        settings: { chartType: 'CONSUMPTION_TREND' },
      },
    ];
  }

  private validateWidgetPositions(widgets: BudgetDashboardWidgetInputDto[]): void {
    const positions = widgets.map((w) => w.position);
    const uniq = new Set(positions);
    if (uniq.size !== positions.length) {
      throw new ConflictException('Positions widgets en doublon');
    }
  }

  private assertChartWidgetRules(
    type: BudgetDashboardWidgetType,
    settings: Record<string, unknown> | undefined,
  ): void {
    if (type === BudgetDashboardWidgetType.CHART) {
      const ct = settings?.chartType;
      if (ct !== 'RUN_BUILD_BREAKDOWN' && ct !== 'CONSUMPTION_TREND') {
        throw new BadRequestException(
          'Widget CHART : settings.chartType obligatoire (RUN_BUILD_BREAKDOWN ou CONSUMPTION_TREND)',
        );
      }
    } else if (
      settings &&
      typeof settings === 'object' &&
      'chartType' in settings &&
      (settings as { chartType?: unknown }).chartType !== undefined
    ) {
      throw new BadRequestException('settings.chartType est réservé au type CHART');
    }
  }

  private async validateDefaultRefs(
    clientId: string,
    exerciseId?: string,
    budgetId?: string,
  ): Promise<void> {
    if (exerciseId) {
      const ex = await this.prisma.budgetExercise.findFirst({
        where: { id: exerciseId, clientId },
      });
      if (!ex) {
        throw new BadRequestException('defaultExerciseId invalide pour ce client');
      }
    }
    if (budgetId) {
      const b = await this.prisma.budget.findFirst({
        where: { id: budgetId, clientId },
      });
      if (!b) {
        throw new BadRequestException('defaultBudgetId invalide pour ce client');
      }
    }
  }
}
