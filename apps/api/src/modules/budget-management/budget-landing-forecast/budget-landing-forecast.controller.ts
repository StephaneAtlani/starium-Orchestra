import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../types/audit-context';
import { BudgetLandingForecastService } from './budget-landing-forecast.service';
import {
  ApplyLandingForecastDto,
  ValidateLandingForecastDto,
} from './dto/landing-forecast.dto';

@Controller('budgets/:budgetId/landing-forecast')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetLandingForecastController {
  constructor(private readonly service: BudgetLandingForecastService) {}

  @Get()
  @RequirePermissions('budgets.read')
  getState(
    @ActiveClientId() clientId: string | undefined,
    @Param('budgetId') budgetId: string,
  ) {
    return this.service.getState(clientId!, budgetId);
  }

  @Post('validate')
  @RequirePermissions('budgets.update')
  validate(
    @ActiveClientId() clientId: string | undefined,
    @Param('budgetId') budgetId: string,
    @Body() dto: ValidateLandingForecastDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.validate(
      clientId!,
      budgetId,
      dto.arbitratedSnapshotId,
      context,
    );
  }

  @Post('apply')
  @RequirePermissions('budgets.landing_forecast.apply')
  apply(
    @ActiveClientId() clientId: string | undefined,
    @Param('budgetId') budgetId: string,
    @Body() dto: ApplyLandingForecastDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.apply(clientId!, budgetId, dto.arbitratedSnapshotId, context);
  }
}
