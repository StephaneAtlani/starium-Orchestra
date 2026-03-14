import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { BudgetSnapshotsService, SnapshotAuditContext } from './budget-snapshots.service';
import { CreateBudgetSnapshotDto } from './dto/create-budget-snapshot.dto';
import { QueryBudgetSnapshotsDto } from './dto/query-budget-snapshots.dto';
import { CompareBudgetSnapshotsDto } from './dto/compare-budget-snapshots.dto';

@Controller('budget-snapshots')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetSnapshotsController {
  constructor(private readonly service: BudgetSnapshotsService) {}

  @Get('compare')
  @RequirePermissions('budgets.read')
  compare(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: CompareBudgetSnapshotsDto,
  ) {
    return this.service.compare(
      clientId!,
      query.leftSnapshotId,
      query.rightSnapshotId,
    );
  }

  @Get()
  @RequirePermissions('budgets.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: QueryBudgetSnapshotsDto,
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
    @Body() dto: CreateBudgetSnapshotDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: SnapshotAuditContext = { actorUserId, meta };
    return this.service.create(clientId!, dto, context);
  }
}
