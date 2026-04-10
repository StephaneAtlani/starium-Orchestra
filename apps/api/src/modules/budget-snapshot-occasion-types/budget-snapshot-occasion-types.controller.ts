import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import {
  BudgetSnapshotOccasionTypesService,
  OccasionTypeAuditContext,
} from './budget-snapshot-occasion-types.service';
import { CreateBudgetSnapshotOccasionTypeDto } from './dto/create-budget-snapshot-occasion-type.dto';
import { UpdateBudgetSnapshotOccasionTypeDto } from './dto/update-budget-snapshot-occasion-type.dto';

@Controller('budget-snapshot-occasion-types')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetSnapshotOccasionTypesController {
  constructor(private readonly service: BudgetSnapshotOccasionTypesService) {}

  @Get()
  @RequirePermissions('budgets.read')
  list(@ActiveClientId() clientId: string | undefined) {
    return this.service.listMergedForClient(clientId!);
  }

  @Post()
  @RequirePermissions('budgets.snapshot_occasion_types.manage')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateBudgetSnapshotOccasionTypeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: OccasionTypeAuditContext = { actorUserId, meta };
    return this.service.createForClient(clientId!, dto, context);
  }

  @Patch(':id')
  @RequirePermissions('budgets.snapshot_occasion_types.manage')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetSnapshotOccasionTypeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: OccasionTypeAuditContext = { actorUserId, meta };
    return this.service.updateForClient(clientId!, id, dto, context);
  }

  @Delete(':id')
  @RequirePermissions('budgets.snapshot_occasion_types.manage')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: OccasionTypeAuditContext = { actorUserId, meta };
    return this.service.softDeleteForClient(clientId!, id, context);
  }
}
