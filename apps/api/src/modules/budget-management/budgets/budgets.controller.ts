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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsQueryDto } from './dto/list-budgets.query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Get()
  @RequirePermissions('budgets.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListBudgetsQueryDto,
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

  @Post()
  @RequirePermissions('budgets.create')
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
  @RequirePermissions('budgets.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.update(clientId!, id, dto, context);
  }
}
