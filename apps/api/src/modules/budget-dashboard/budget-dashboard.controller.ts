import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { BudgetDashboardService } from './budget-dashboard.service';
import { DashboardQueryDto } from './dto/dashboard.query.dto';

@Controller('budget-dashboard')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetDashboardController {
  constructor(private readonly service: BudgetDashboardService) {}

  @Get()
  @RequirePermissions('budgets.read')
  getDashboard(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: DashboardQueryDto,
  ) {
    return this.service.getDashboard(clientId!, query);
  }
}
