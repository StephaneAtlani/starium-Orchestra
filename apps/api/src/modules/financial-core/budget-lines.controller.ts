import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { FinancialAllocationsService } from './allocations/financial-allocations.service';
import { FinancialEventsService } from './events/financial-events.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('budget-lines')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetLinesController {
  constructor(
    private readonly allocations: FinancialAllocationsService,
    private readonly events: FinancialEventsService,
  ) {}

  @Get(':id/allocations')
  @RequirePermissions('budgets.read')
  listAllocations(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') budgetLineId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.allocations.listByBudgetLine(clientId!, budgetLineId, {
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id/events')
  @RequirePermissions('budgets.read')
  listEvents(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') budgetLineId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.events.listByBudgetLine(clientId!, budgetLineId, {
      limit: query.limit,
      offset: query.offset,
    });
  }
}
