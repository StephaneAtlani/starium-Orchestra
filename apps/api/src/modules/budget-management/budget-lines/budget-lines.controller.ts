import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { BudgetLinesService } from './budget-lines.service';
import { CreateBudgetLineDto } from './dto/create-budget-line.dto';
import { ListBudgetLinesQueryDto } from './dto/list-budget-lines.query.dto';
import { BulkUpdateBudgetLineStatusDto } from '../dto/bulk-update-status.dto';
import { UpdateBudgetLineDto } from './dto/update-budget-line.dto';

@Controller('budget-lines')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetLinesController {
  constructor(private readonly service: BudgetLinesService) {}

  @Get()
  @RequirePermissions('budgets.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListBudgetLinesQueryDto,
  ) {
    return this.service.list(clientId!, query);
  }

  @Get(':id')
  @RequirePermissions('budgets.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getById(clientId!, id);
  }

  @Patch('bulk-status')
  @RequirePermissions('budgets.update')
  bulkUpdateStatus(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: BulkUpdateBudgetLineStatusDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.bulkUpdateStatus(clientId!, dto, context);
  }

  @Post()
  @RequirePermissions('budgets.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateBudgetLineDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.create(clientId!, dto, context);
  }

  @Patch(':id')
  @RequirePermissions('budgets.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetLineDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.update(clientId!, id, dto, context);
  }
}
