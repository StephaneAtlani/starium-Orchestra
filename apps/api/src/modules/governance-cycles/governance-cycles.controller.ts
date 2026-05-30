import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGovernanceCycleDto } from './dto/create-governance-cycle.dto';
import { CreateGovernanceCycleItemDto } from './dto/create-governance-cycle-item.dto';
import { ListGovernanceCycleItemsQueryDto } from './dto/list-governance-cycle-items-query.dto';
import { ListGovernanceCyclesQueryDto } from './dto/list-governance-cycles-query.dto';
import { UpdateGovernanceCycleDto } from './dto/update-governance-cycle.dto';
import { UpdateGovernanceCycleItemDto } from './dto/update-governance-cycle-item.dto';
import { GovernanceCyclesService } from './governance-cycles.service';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
@Controller()
export class GovernanceCyclesController {
  constructor(private readonly service: GovernanceCyclesService) {}

  @Get('governance-cycles')
  @RequirePermissions('governance_cycles.read')
  listCycles(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListGovernanceCyclesQueryDto,
  ) {
    return this.service.listCycles(clientId!, query);
  }

  @Post('governance-cycles')
  @RequirePermissions('governance_cycles.create')
  createCycle(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateGovernanceCycleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.createCycle(clientId!, dto, { actorUserId, meta });
  }

  @Get('governance-cycles/:id')
  @RequirePermissions('governance_cycles.read')
  getCycle(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getCycleById(clientId!, id);
  }

  @Patch('governance-cycles/:id')
  @RequirePermissions('governance_cycles.update')
  updateCycle(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateGovernanceCycleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateCycle(clientId!, id, dto, { actorUserId, meta });
  }

  @Delete('governance-cycles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('governance_cycles.delete')
  archiveCycle(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.archiveCycle(clientId!, id, { actorUserId, meta });
  }

  @Get('governance-cycles/:id/items')
  @RequirePermissions('governance_cycles.read')
  listItems(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') cycleId: string,
    @Query() query: ListGovernanceCycleItemsQueryDto,
  ) {
    return this.service.listItems(clientId!, cycleId, query);
  }

  @Post('governance-cycles/:id/items')
  @RequirePermissions('governance_cycles.create')
  createItem(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') cycleId: string,
    @Body() dto: CreateGovernanceCycleItemDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.createItem(clientId!, cycleId, dto, { actorUserId, meta });
  }

  @Get('governance-cycles/:id/items/:itemId')
  @RequirePermissions('governance_cycles.read')
  getItem(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') cycleId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.getItemById(clientId!, cycleId, itemId);
  }

  @Patch('governance-cycles/:id/items/:itemId')
  @RequireAnyPermissions('governance_cycles.update', 'governance_cycles.arbitrate')
  patchItem(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') cycleId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateGovernanceCycleItemDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateItem(clientId!, cycleId, itemId, dto, {
      actorUserId: actorUserId!,
      meta,
    });
  }

  @Delete('governance-cycles/:id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('governance_cycles.update')
  deleteItem(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') cycleId: string,
    @Param('itemId') itemId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.deleteItem(clientId!, cycleId, itemId, {
      actorUserId,
      meta,
    });
  }
}
