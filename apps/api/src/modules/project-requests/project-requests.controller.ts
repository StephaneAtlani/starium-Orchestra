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
import { ProjectRequestsService } from './project-requests.service';

@Controller('project-requests')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  LicenseWriteGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
export class ProjectRequestsController {
  constructor(private readonly service: ProjectRequestsService) {}

  @Get()
  @RequirePermissions('project_requests.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() actorUserId: string | undefined,
    @Query() query: ListProjectRequestsQueryDto,
  ) {
    return this.service.list(clientId!, actorUserId!, query);
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
