import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { BudgetLandingService } from './budget-landing.service';
import { BudgetLineLandingQueryDto } from './dto/budget-line-landing.query.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Controller('budget-lines')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetLineLandingController {
  constructor(
    private readonly landingService: BudgetLandingService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @Get(':id/landing')
  @RequirePermissions('budgets.read')
  async getLineLanding(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') lineId: string,
    @Query() query: BudgetLineLandingQueryDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    const referenceDate = query.referenceDate
      ? new Date(query.referenceDate)
      : undefined;
    const result = await this.landingService.getBudgetLineLanding(
      clientId!,
      lineId,
      referenceDate,
    );

    await this.auditLogs.create({
      clientId: clientId!,
      userId: actorUserId,
      action: 'budget.landing.viewed',
      resourceType: 'budget_line',
      resourceId: lineId,
    });

    return result;
  }
}
