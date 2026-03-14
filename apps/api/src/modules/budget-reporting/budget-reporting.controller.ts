import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { BudgetReportingService } from './budget-reporting.service';
import { ListExerciseBudgetsQueryDto } from './dto/list-exercise-budgets.query.dto';
import { ListBudgetEnvelopesReportQueryDto } from './dto/list-budget-envelopes-report.query.dto';
import { ListEnvelopeLinesQueryDto } from './dto/list-envelope-lines.query.dto';
import { EnvelopeSummaryQueryDto } from './dto/envelope-summary.query.dto';

@Controller('budget-reporting')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetReportingController {
  constructor(private readonly service: BudgetReportingService) {}

  @Get('exercises/:id/summary')
  @RequirePermissions('budgets.read')
  getExerciseSummary(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getExerciseSummary(clientId!, id);
  }

  @Get('exercises/:id/budgets')
  @RequirePermissions('budgets.read')
  listBudgetsForExercise(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Query() query: ListExerciseBudgetsQueryDto,
  ) {
    return this.service.listBudgetsForExercise(clientId!, id, query);
  }

  @Get('budgets/:id/summary')
  @RequirePermissions('budgets.read')
  getBudgetSummary(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getBudgetSummary(clientId!, id);
  }

  @Get('budgets/:id/envelopes')
  @RequirePermissions('budgets.read')
  listEnvelopesForBudget(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Query() query: ListBudgetEnvelopesReportQueryDto,
  ) {
    return this.service.listEnvelopesForBudget(clientId!, id, query);
  }

  @Get('budgets/:id/breakdown-by-type')
  @RequirePermissions('budgets.read')
  getBreakdownByType(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getBreakdownByType(clientId!, id);
  }

  @Get('envelopes/:id/summary')
  @RequirePermissions('budgets.read')
  getEnvelopeSummary(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Query() query: EnvelopeSummaryQueryDto,
  ) {
    return this.service.getEnvelopeSummary(
      clientId!,
      id,
      query.includeChildren === true,
    );
  }

  @Get('envelopes/:id/lines')
  @RequirePermissions('budgets.read')
  listLinesForEnvelope(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Query() query: ListEnvelopeLinesQueryDto,
  ) {
    return this.service.listLinesForEnvelope(clientId!, id, query);
  }
}
