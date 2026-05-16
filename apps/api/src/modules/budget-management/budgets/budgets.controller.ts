import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { RequireAccessIntent } from '../../../common/decorators/require-access-intent.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import type { RequestWithClient } from '../../../common/types/request-with-client';
import type { AuditContext } from '../types/audit-context';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsQueryDto } from './dto/list-budgets.query.dto';
import { BulkUpdateBudgetStatusDto } from '../dto/bulk-update-status.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetDecisionHistoryService } from '../budget-decision-history.service';
import { ListBudgetDecisionHistoryQueryDto } from '../budget-decision-history.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetsController {
  constructor(
    private readonly service: BudgetsService,
    private readonly decisionHistoryService: BudgetDecisionHistoryService,
  ) {}

  @Get()
  @RequireAccessIntent({ module: 'budgets', intent: 'read' })
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListBudgetsQueryDto,
    @RequestUserId() userId: string | undefined,
    @Req() request: RequestWithClient,
  ) {
    return this.service.list(clientId!, query, userId, request);
  }

  /** RFC-032 — doit rester avant `GET :id` pour ne pas capturer `decision-history` comme id. */
  @Get(':id/decision-history')
  @RequirePermissions('budgets.read')
  decisionHistory(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') budgetId: string,
    @Query() query: ListBudgetDecisionHistoryQueryDto,
  ) {
    return this.decisionHistoryService.list(clientId!, budgetId, query);
  }

  @Get(':id')
  @RequireAccessIntent({ module: 'budgets', intent: 'read' })
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() userId: string | undefined,
    @Req() request: RequestWithClient,
  ) {
    return this.service.getById(clientId!, id, userId, request);
  }

  @Patch('bulk-status')
  @RequirePermissions('budgets.update')
  bulkUpdateStatus(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: BulkUpdateBudgetStatusDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.bulkUpdateStatus(clientId!, dto, context);
  }

  @Post()
  @RequireAccessIntent({ module: 'budgets', intent: 'create' })
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateBudgetDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.create(clientId!, dto, context);
  }

  @Patch(':id')
  @RequireAccessIntent({ module: 'budgets', intent: 'write' })
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
    @Req() request: RequestWithClient,
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.update(clientId!, id, dto, context, request);
  }
}
