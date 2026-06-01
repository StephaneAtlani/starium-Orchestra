import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { CreateGovernanceCycleInstanceDto } from './dto/create-governance-cycle-instance.dto';
import { ListGovernanceCycleInstancesQueryDto } from './dto/list-governance-cycle-instances-query.dto';
import { ReplaceInstanceAgendaDto } from './dto/replace-instance-agenda.dto';
import { UpdateGovernanceCycleInstanceDto } from './dto/update-governance-cycle-instance.dto';
import { UpsertInstanceItemDecisionsDto } from './dto/upsert-instance-item-decisions.dto';
import { GovernanceCycleInstancesService } from './governance-cycle-instances.service';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
@Controller('governance-cycles/:cycleId/instances')
export class GovernanceCycleInstancesController {
  constructor(private readonly instances: GovernanceCycleInstancesService) {}

  @Get()
  @RequirePermissions('governance_cycles.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @Query() query: ListGovernanceCycleInstancesQueryDto,
  ) {
    return this.instances.listInstances(clientId!, cycleId, query);
  }

  @Post()
  @RequireAnyPermissions('governance_cycles.create', 'governance_cycles.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @Body() dto: CreateGovernanceCycleInstanceDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.instances.createInstance(clientId!, cycleId, dto, {
      actorUserId,
      meta,
    });
  }

  @Post('generate')
  @RequirePermissions('governance_cycles.update')
  generate(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.instances.generateInstances(clientId!, cycleId, {
      actorUserId,
      meta,
    });
  }

  @Get(':instanceId')
  @RequirePermissions('governance_cycles.read')
  get(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @Param('instanceId') instanceId: string,
  ) {
    return this.instances.getInstance(clientId!, cycleId, instanceId);
  }

  @Patch(':instanceId')
  @RequirePermissions('governance_cycles.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @Param('instanceId') instanceId: string,
    @Body() dto: UpdateGovernanceCycleInstanceDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.instances.updateInstance(clientId!, cycleId, instanceId, dto, {
      actorUserId,
      meta,
    });
  }

  @Post(':instanceId/open')
  @RequirePermissions('governance_cycles.update')
  open(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @Param('instanceId') instanceId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.instances.openInstance(clientId!, cycleId, instanceId, {
      actorUserId,
      meta,
    });
  }

  @Post(':instanceId/archive')
  @RequirePermissions('governance_cycles.update')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @Param('instanceId') instanceId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.instances.archiveInstance(clientId!, cycleId, instanceId, {
      actorUserId,
      meta,
    });
  }

  @Put(':instanceId/agenda')
  @RequirePermissions('governance_cycles.update')
  replaceAgenda(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @Param('instanceId') instanceId: string,
    @Body() dto: ReplaceInstanceAgendaDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.instances.replaceAgenda(clientId!, cycleId, instanceId, dto, {
      actorUserId,
      meta,
    });
  }

  @Patch(':instanceId/decisions')
  @RequirePermissions('governance_cycles.arbitrate')
  patchDecisions(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @Param('instanceId') instanceId: string,
    @Body() dto: UpsertInstanceItemDecisionsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.instances.upsertDecisions(clientId!, cycleId, instanceId, dto, {
      actorUserId,
      meta,
    });
  }

  @Post(':instanceId/close')
  @RequirePermissions('governance_cycles.arbitrate')
  close(
    @ActiveClientId() clientId: string | undefined,
    @Param('cycleId') cycleId: string,
    @Param('instanceId') instanceId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.instances.closeInstance(clientId!, cycleId, instanceId, {
      actorUserId,
      meta,
    });
  }
}
