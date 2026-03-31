import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { BudgetForecastService } from './budget-forecast.service';
import { ListForecastEnvelopeLinesQueryDto } from './dto/list-forecast-envelope-lines.query.dto';

@Controller('budget-forecast')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetForecastController {
  constructor(private readonly service: BudgetForecastService) {}

  @Get('budgets/:id')
  @RequirePermissions('budgets.read')
  getBudgetForecast(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') budgetId: string,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.getBudgetForecast(clientId!, budgetId, actorUserId);
  }

  @Get('envelopes/:id')
  @RequirePermissions('budgets.read')
  getEnvelopeForecast(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') envelopeId: string,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.getEnvelopeForecast(clientId!, envelopeId, actorUserId);
  }

  @Get('envelopes/:id/lines')
  @RequirePermissions('budgets.read')
  listEnvelopeForecastLines(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') envelopeId: string,
    @Query() query: ListForecastEnvelopeLinesQueryDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.listEnvelopeForecastLines(
      clientId!,
      envelopeId,
      query,
      actorUserId,
    );
  }
}
