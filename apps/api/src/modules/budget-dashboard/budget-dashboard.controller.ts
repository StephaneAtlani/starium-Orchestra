import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { BudgetDashboardConfigService } from './budget-dashboard-config.service';
import { BudgetDashboardService } from './budget-dashboard.service';
import { CreateBudgetDashboardConfigDto } from './dto/create-budget-dashboard-config.dto';
import { DashboardQueryDto } from './dto/dashboard.query.dto';
import { UpdateBudgetDashboardConfigDto } from './dto/update-budget-dashboard-config.dto';

@Controller('budget-dashboard')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetDashboardController {
  constructor(
    private readonly service: BudgetDashboardService,
    private readonly configService: BudgetDashboardConfigService,
  ) {}

  @Get()
  @RequirePermissions('budgets.read')
  getDashboard(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: DashboardQueryDto,
  ) {
    return this.service.getDashboard(clientId!, query);
  }

  @Get('configs')
  @RequirePermissions('budgets.read')
  listConfigs(@ActiveClientId() clientId: string | undefined) {
    return this.configService.listConfigs(clientId!);
  }

  @Post('configs')
  @RequirePermissions('budgets.update')
  createConfig(
    @ActiveClientId() clientId: string | undefined,
    @Body() body: CreateBudgetDashboardConfigDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.configService.createConfig(clientId!, body, actorUserId);
  }

  @Patch('configs/:id')
  @RequirePermissions('budgets.update')
  updateConfig(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() body: UpdateBudgetDashboardConfigDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.configService.updateConfig(clientId!, id, body, actorUserId);
  }

  @Delete('configs/:id')
  @HttpCode(204)
  @RequirePermissions('budgets.update')
  async deleteConfig(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    await this.configService.deleteConfig(clientId!, id, actorUserId);
  }
}
