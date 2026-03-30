import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { BudgetComparisonService } from './budget-comparison.service';
import { CompareBudgetQueryDto } from './dto/compare-budget.query.dto';
import { CompareEntitiesQueryDto } from './dto/compare-entities.query.dto';

@Controller('budget-comparisons')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetComparisonController {
  constructor(private readonly service: BudgetComparisonService) {}

  @Get('budgets/:budgetId')
  @RequirePermissions('budgets.read')
  compareBudget(
    @ActiveClientId() clientId: string | undefined,
    @Param('budgetId') budgetId: string,
    @Query() query: CompareBudgetQueryDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.compareBudget(
      clientId!,
      budgetId,
      query.compareTo,
      query.targetId,
      actorUserId,
    );
  }

  @Get('snapshots')
  @RequirePermissions('budgets.read')
  compareSnapshots(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: CompareEntitiesQueryDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.compareSnapshots(
      clientId!,
      query.leftId,
      query.rightId,
      actorUserId,
    );
  }

  @Get('versions')
  @RequirePermissions('budgets.read')
  compareVersions(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: CompareEntitiesQueryDto,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.compareVersions(
      clientId!,
      query.leftId,
      query.rightId,
      actorUserId,
    );
  }
}
