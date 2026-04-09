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
import { BudgetVersioningService } from './budget-versioning.service';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { CompareVersionsQueryDto } from './dto/compare-versions.query.dto';
import { CreateCycleRevisionDto } from './dto/create-cycle-revision.dto';
import { CloseBudgetCycleDto } from './dto/close-budget-cycle.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetVersioningController {
  constructor(private readonly service: BudgetVersioningService) {}

  @Post(':id/versioning/cycle-revision')
  @RequirePermissions('budgets.versioning_cycle.manage')
  createCycleRevision(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() body: CreateCycleRevisionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string } | undefined,
  ) {
    return this.service.createCycleRevision(clientId!, id, body.phase, {
      actorUserId,
      meta,
    });
  }

  @Post(':id/versioning/close-cycle')
  @RequirePermissions('budgets.versioning_cycle.manage')
  closeBudgetCycle(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() body: CloseBudgetCycleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string } | undefined,
  ) {
    return this.service.closeBudgetCycle(clientId!, id, body, {
      actorUserId,
      meta,
    });
  }

  @Post(':id/create-baseline')
  @RequirePermissions('budgets.create')
  createBaseline(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string } | undefined,
  ) {
    return this.service.createBaseline(clientId!, id, { actorUserId, meta });
  }

  @Post(':id/create-revision')
  @RequirePermissions('budgets.create')
  createRevision(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: CreateRevisionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string } | undefined,
  ) {
    return this.service.createRevision(clientId!, id, dto, { actorUserId, meta });
  }

  @Post(':id/activate-version')
  @RequirePermissions('budgets.update')
  activateVersion(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string } | undefined,
  ) {
    return this.service.activateVersion(clientId!, id, { actorUserId, meta });
  }

  @Post(':id/archive-version')
  @RequirePermissions('budgets.update')
  archiveVersion(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string } | undefined,
  ) {
    return this.service.archiveVersion(clientId!, id, { actorUserId, meta });
  }

  @Get(':id/version-history')
  @RequirePermissions('budgets.read')
  getVersionHistory(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getVersionHistory(clientId!, id);
  }

  @Get(':id/compare')
  @RequirePermissions('budgets.read')
  compareVersions(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') sourceBudgetId: string,
    @Query() query: CompareVersionsQueryDto,
  ) {
    return this.service.compareVersions(
      clientId!,
      sourceBudgetId,
      query.targetBudgetId,
    );
  }
}
