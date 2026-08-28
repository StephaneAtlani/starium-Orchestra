import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { BudgetLandingReadService } from './budget-landing-read.service';
import { ListForecastEnvelopeLinesQueryDto } from '../budget-forecast/dto/list-forecast-envelope-lines.query.dto';

@Controller('budget-landing')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetLandingController {
  constructor(private readonly service: BudgetLandingReadService) {}

  @Get('budgets/:id')
  @RequirePermissions('budgets.read')
  getBudgetLanding(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') budgetId: string,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.getBudgetLanding(clientId!, budgetId, actorUserId);
  }

  @Get('envelopes/:id')
  @RequirePermissions('budgets.read')
  getEnvelopeLanding(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') envelopeId: string,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.getEnvelopeLanding(clientId!, envelopeId, actorUserId);
  }

  @Get('envelopes/:id/lines')
  @RequirePermissions('budgets.read')
  listEnvelopeLandingLines(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') envelopeId: string,
    @Query() query: ListForecastEnvelopeLinesQueryDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.listEnvelopeLandingLines(
      clientId!,
      envelopeId,
      query,
      actorUserId,
    );
  }
}

/** Proxy déprécié : délègue au landing avec header Deprecation. */
export function setForecastDeprecationHeader(res: Response): void {
  res.setHeader('Deprecation', 'true');
}
