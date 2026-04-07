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
import { BudgetExercisesService } from './budget-exercises.service';
import type { AuditContext } from '../types/audit-context';
import { CreateBudgetExerciseDto } from './dto/create-budget-exercise.dto';
import { ListBudgetExercisesQueryDto } from './dto/list-budget-exercises.query.dto';
import { BulkUpdateBudgetExerciseStatusDto } from '../dto/bulk-update-status.dto';
import { UpdateBudgetExerciseDto } from './dto/update-budget-exercise.dto';

@Controller('budget-exercises')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetExercisesController {
  constructor(private readonly service: BudgetExercisesService) {}

  @Get()
  @RequirePermissions('budgets.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListBudgetExercisesQueryDto,
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
    @Body() dto: BulkUpdateBudgetExerciseStatusDto,
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
    @Body() dto: CreateBudgetExerciseDto,
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
    @Body() dto: UpdateBudgetExerciseDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.update(clientId!, id, dto, context);
  }
}
