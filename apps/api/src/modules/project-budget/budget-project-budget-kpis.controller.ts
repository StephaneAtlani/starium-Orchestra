import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { ProjectBudgetLinksService } from './project-budget-links.service';

/**
 * RFC-PROJ-010-B lot B — KPI cockpit budget × projet.
 */
@Controller('budgets/:budgetId/project-budget-kpis')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetProjectBudgetKpisController {
  constructor(private readonly linksService: ProjectBudgetLinksService) {}

  @Get()
  @RequirePermissions('budgets.read')
  getKpis(
    @ActiveClientId() clientId: string | undefined,
    @Param('budgetId') budgetId: string,
  ) {
    return this.linksService.getProjectBudgetKpis(clientId!, budgetId);
  }
}
