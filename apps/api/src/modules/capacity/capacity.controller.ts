import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CapacityAllocationSourceType } from '@prisma/client';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CapacityAggregateService } from './capacity-aggregate.service';
import { CapacityAllocationService } from './capacity-allocation.service';
import { CapacityCalendarService } from './capacity-calendar.service';
import { CapacityResolveService } from './capacity-resolve.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { DashboardQueryDto } from './dto/dashboard.query.dto';
import { GenerateMonthlyDto } from './dto/generate-monthly.dto';
import { ListAllocationsQueryDto } from './dto/list-allocations.query.dto';
import { PatchPrimaryWorkTeamDto } from './dto/patch-primary-work-team.dto';
import { PutMemberMonthlyDto } from './dto/put-member-monthly.dto';
import { PutMonthlySettingsDto } from './dto/put-monthly-settings.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';

@Controller('capacity')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
export class CapacityController {
  constructor(
    private readonly calendar: CapacityCalendarService,
    private readonly resolve: CapacityResolveService,
    private readonly allocations: CapacityAllocationService,
    private readonly aggregates: CapacityAggregateService,
  ) {}

  @Get('settings/monthly')
  @RequirePermissions('capacity.read')
  listMonthly(
    @ActiveClientId() clientId: string | undefined,
    @Query('year') year?: string,
  ) {
    return this.calendar.listMonthly(
      clientId!,
      year ? Number(year) : undefined,
    );
  }

  @Put('settings/monthly')
  @RequirePermissions('capacity.settings.manage')
  putMonthly(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: PutMonthlySettingsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.calendar.putMonthlySettings(clientId!, dto, actorUserId, meta);
  }

  @Post('settings/monthly/generate')
  @RequirePermissions('capacity.settings.manage')
  generateMonthly(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: GenerateMonthlyDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.calendar.generateYear(clientId!, dto, actorUserId, meta);
  }

  @Get('members/:resourceId/monthly')
  @RequirePermissions('capacity.read')
  memberMonthly(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceId') resourceId: string,
    @Query('year') year?: string,
  ) {
    return this.resolve.listMemberMonthly(
      clientId!,
      resourceId,
      year ? Number(year) : undefined,
    );
  }

  @Put('members/:resourceId/monthly')
  @RequirePermissions('capacity.members.manage')
  putMemberMonthly(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceId') resourceId: string,
    @Body() dto: PutMemberMonthlyDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.resolve.putMemberMonthly(
      clientId!,
      resourceId,
      dto,
      actorUserId,
      meta,
    );
  }

  @Patch('members/:resourceId/primary-work-team')
  @RequirePermissions('capacity.members.manage')
  patchPrimary(
    @ActiveClientId() clientId: string | undefined,
    @Param('resourceId') resourceId: string,
    @Body() dto: PatchPrimaryWorkTeamDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.resolve.patchPrimaryWorkTeam(
      clientId!,
      resourceId,
      dto,
      actorUserId,
      meta,
    );
  }

  @Get('allocations')
  @RequirePermissions('capacity.read')
  listAllocations(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Query() query: ListAllocationsQueryDto,
  ) {
    return this.allocations.list(clientId!, userId!, query);
  }

  @Get('allocations/:id')
  @RequirePermissions('capacity.read')
  getAllocation(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.allocations.getById(clientId!, userId!, id);
  }

  @Post('allocations')
  @RequirePermissions('capacity.allocations.manage')
  createAllocation(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Body() dto: CreateAllocationDto,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.allocations.create(clientId!, userId!, dto, userId, meta);
  }

  @Patch('allocations/:id')
  @RequirePermissions('capacity.allocations.manage')
  updateAllocation(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateAllocationDto,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.allocations.update(clientId!, userId!, id, dto, userId, meta);
  }

  @Delete('allocations/:id')
  @RequirePermissions('capacity.allocations.manage')
  deleteAllocation(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Param('id') id: string,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.allocations.remove(clientId!, userId!, id, userId, meta);
  }

  @Get('dashboard/resources')
  @RequirePermissions('capacity.read')
  dashboardResources(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: DashboardQueryDto,
  ) {
    return this.aggregates.dashboardResources(clientId!, query);
  }

  @Get('dashboard/work-teams')
  @RequirePermissions('capacity.read')
  dashboardWorkTeams(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: DashboardQueryDto,
  ) {
    return this.aggregates.dashboardWorkTeams(clientId!, query);
  }

  @Get('dashboard/portfolio')
  @RequirePermissions('capacity.read')
  dashboardPortfolio(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: DashboardQueryDto,
  ) {
    return this.aggregates.dashboardPortfolio(clientId!, query);
  }

  @Get('sources/:type/:id/allocations')
  @RequirePermissions('capacity.read')
  sourceAllocations(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Param('type', new ParseEnumPipe(CapacityAllocationSourceType))
    type: CapacityAllocationSourceType,
    @Param('id') id: string,
  ) {
    return this.allocations.listBySource(clientId!, userId!, type, id);
  }
}
