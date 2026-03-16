import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import { AuditContext } from '../types/audit-context';
import { BudgetLinePlanningService } from './budget-line-planning.service';
import { UpdateBudgetLinePlanningManualDto } from './dto/update-budget-line-planning-manual.dto';
import { ApplyAnnualSpreadDto } from './dto/apply-annual-spread.dto';
import { ApplyQuarterlyPlanningDto } from './dto/apply-quarterly-planning.dto';
import { ApplyOneShotPlanningDto } from './dto/apply-one-shot-planning.dto';
import { ApplyGrowthPlanningDto } from './dto/apply-growth-planning.dto';
import { CalculatePlanningDto } from './dto/calculate-planning.dto';
import { ApplyCalculationPlanningDto } from './dto/apply-calculation-planning.dto';

@Controller('budget-lines/:id/planning')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetLinePlanningController {
  constructor(private readonly service: BudgetLinePlanningService) {}

  @Get()
  @RequirePermissions('budgets.read')
  getPlanning(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') lineId: string,
  ) {
    return this.service.getPlanning(clientId!, lineId);
  }

  @Put()
  @RequirePermissions('budgets.update')
  replaceManualPlanning(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') lineId: string,
    @Body() dto: UpdateBudgetLinePlanningManualDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.replaceManualPlanning(clientId!, lineId, dto, context);
  }

  @Post('apply-annual-spread')
  @RequirePermissions('budgets.update')
  applyAnnualSpread(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') lineId: string,
    @Body() dto: ApplyAnnualSpreadDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.applyAnnualSpread(clientId!, lineId, dto, context);
  }

  @Post('apply-quarterly')
  @RequirePermissions('budgets.update')
  applyQuarterly(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') lineId: string,
    @Body() dto: ApplyQuarterlyPlanningDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.applyQuarterly(clientId!, lineId, dto, context);
  }

  @Post('apply-one-shot')
  @RequirePermissions('budgets.update')
  applyOneShot(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') lineId: string,
    @Body() dto: ApplyOneShotPlanningDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.applyOneShot(clientId!, lineId, dto, context);
  }

  @Post('apply-growth')
  @RequirePermissions('budgets.update')
  applyGrowth(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') lineId: string,
    @Body() dto: ApplyGrowthPlanningDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.applyGrowth(clientId!, lineId, dto, context);
  }

  @Post('calculate')
  @RequirePermissions('budgets.update')
  calculate(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') lineId: string,
    @Body() dto: CalculatePlanningDto,
  ) {
    return this.service.calculateFormula(clientId!, lineId, dto);
  }

  @Post('apply-calculation')
  @RequirePermissions('budgets.update')
  applyCalculation(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') lineId: string,
    @Body() dto: ApplyCalculationPlanningDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.applyCalculation(clientId!, lineId, dto, context);
  }
}

