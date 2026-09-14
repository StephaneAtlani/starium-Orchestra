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
import { ProjectRequestType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseWriteGuard } from '../../common/guards/license-write.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { RequireWriteLicense } from '../../common/decorators/require-write-license.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { CreateProjectRequestDto } from './dto/create-project-request.dto';
import { UpdateProjectRequestDto } from './dto/update-project-request.dto';
import { ListProjectRequestsQueryDto } from './dto/list-project-requests-query.dto';
import { ProjectRequestDecisionDto } from './dto/project-request-decision.dto';
import { ProjectRequestRouteDto } from './dto/project-request-route.dto';
import { ProjectRequestCancelDto } from './dto/project-request-cancel.dto';
import {
  PreviewCircuitQueryDto,
  ProjectRequestAgendaDto,
  ProjectRequestCommitteeDecideDto,
  ProjectRequestInstructDto,
  ProjectRequestN1DecideDto,
} from './dto/project-request-circuit-actions.dto';
import { ProjectRequestsService } from './project-requests.service';
import { ProjectRequestCdcWorkflowService } from './project-request-cdc-workflow.service';
import { ClientProjectRequestWorkflowSettingsService } from '../clients/client-project-request-workflow-settings.service';

@Controller('project-requests')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  LicenseWriteGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
export class ProjectRequestsController {
  constructor(
    private readonly service: ProjectRequestsService,
    private readonly cdc: ProjectRequestCdcWorkflowService,
    private readonly workflowSettings: ClientProjectRequestWorkflowSettingsService,
  ) {}

  @Get()
  @RequirePermissions('project_requests.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Query() query: ListProjectRequestsQueryDto,
  ) {
    return this.service.list(clientId!, actorUserId!, query);
  }

  @Get('summary')
  @RequirePermissions('project_requests.read')
  summary(@ActiveClientId() clientId: string | undefined) {
    return this.cdc.summary(clientId!);
  }

  @Get('preview-circuit')
  @RequirePermissions('project_requests.read')
  async previewCircuit(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: PreviewCircuitQueryDto,
  ) {
    const settings = await this.workflowSettings.ensureRow(clientId!);
    const type =
      query.type &&
      Object.values(ProjectRequestType).includes(query.type as ProjectRequestType)
        ? (query.type as ProjectRequestType)
        : null;
    return this.cdc.previewCircuit(settings, type, query.budget ?? null);
  }

  @Get('validator-options')
  @RequirePermissions('project_requests.create')
  validatorOptions(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
  ) {
    return this.service.validatorOptions(clientId!, actorUserId!);
  }

  @Post()
  @RequirePermissions('project_requests.create')
  @RequireWriteLicense()
  create(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Body() dto: CreateProjectRequestDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.service.create(clientId!, actorUserId!, dto, {
      actorUserId,
      meta,
    });
  }

  @Get(':id')
  @RequirePermissions('project_requests.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getById(clientId!, actorUserId!, id);
  }

  @Patch(':id')
  @RequireAnyPermissions('project_requests.create', 'project_requests.update')
  @RequireWriteLicense()
  update(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateProjectRequestDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.service.update(clientId!, actorUserId!, id, dto, {
      actorUserId,
      meta,
    });
  }

  @Post(':id/submit')
  @RequireAnyPermissions('project_requests.create', 'project_requests.update')
  @RequireWriteLicense()
  submit(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.service.submit(clientId!, actorUserId!, id, {
      actorUserId,
      meta,
    });
  }

  @Post(':id/n1-decide')
  @RequirePermissions('project_requests.validate')
  @RequireWriteLicense()
  async n1Decide(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ProjectRequestN1DecideDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    await this.cdc.n1Decide(clientId!, actorUserId!, id, dto, {
      actorUserId,
      meta,
    });
    return this.service.getById(clientId!, actorUserId!, id);
  }

  @Post(':id/instruct')
  @RequireAnyPermissions('project_requests.instruct', 'project_requests.route')
  @RequireWriteLicense()
  async instruct(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ProjectRequestInstructDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    await this.cdc.instruct(clientId!, actorUserId!, id, dto, {
      actorUserId,
      meta,
    });
    return this.service.getById(clientId!, actorUserId!, id);
  }

  @Post(':id/agenda')
  @RequireAnyPermissions('project_requests.instruct', 'project_requests.route')
  @RequireWriteLicense()
  async agenda(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ProjectRequestAgendaDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    await this.cdc.agenda(clientId!, actorUserId!, id, dto, {
      actorUserId,
      meta,
    });
    return this.service.getById(clientId!, actorUserId!, id);
  }

  @Post(':id/committee-decide')
  @RequireAnyPermissions('project_requests.instruct', 'project_requests.route')
  @RequireWriteLicense()
  async committeeDecide(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ProjectRequestCommitteeDecideDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    await this.cdc.committeeDecide(clientId!, actorUserId!, id, dto, {
      actorUserId,
      meta,
    });
    return this.service.getById(clientId!, actorUserId!, id);
  }

  @Post(':id/convert')
  @RequireAnyPermissions('project_requests.instruct', 'project_requests.route')
  @RequireWriteLicense()
  async convert(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    await this.cdc.convert(clientId!, actorUserId!, id, { actorUserId, meta });
    return this.service.getById(clientId!, actorUserId!, id);
  }

  @Post(':id/reopen')
  @RequireAnyPermissions('project_requests.instruct', 'project_requests.route')
  @RequireWriteLicense()
  async reopen(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    await this.cdc.reopen(clientId!, actorUserId!, id, { actorUserId, meta });
    return this.service.getById(clientId!, actorUserId!, id);
  }

  @Post(':id/decision')
  @RequirePermissions('project_requests.validate')
  @RequireWriteLicense()
  decision(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ProjectRequestDecisionDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.service.decision(clientId!, actorUserId!, id, dto, {
      actorUserId,
      meta,
    });
  }

  @Post(':id/route')
  @RequirePermissions('project_requests.route')
  @RequireWriteLicense()
  route(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ProjectRequestRouteDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.service.route(clientId!, actorUserId!, id, dto, {
      actorUserId,
      meta,
    });
  }

  @Post(':id/cancel')
  @RequireAnyPermissions('project_requests.create', 'project_requests.update')
  @RequireWriteLicense()
  cancel(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ProjectRequestCancelDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.service.cancel(clientId!, actorUserId!, id, dto, {
      actorUserId,
      meta,
    });
  }
}
