import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  CreateProjectReviewSeriesDto,
  GenerateProjectReviewSeriesDto,
  UpdateProjectReviewSeriesDto,
} from './dto/project-review-series.dto';
import { ProjectReviewSeriesService } from './project-review-series.service';

@Controller('projects/:projectId/review-series')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectReviewSeriesController {
  constructor(private readonly seriesService: ProjectReviewSeriesService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.seriesService.list(clientId!, projectId);
  }

  @Get(':seriesId')
  @RequirePermissions('projects.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('seriesId') seriesId: string,
  ) {
    return this.seriesService.getById(clientId!, projectId, seriesId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectReviewSeriesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.seriesService.create(clientId!, projectId, dto, context);
  }

  @Patch(':seriesId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('seriesId') seriesId: string,
    @Body() dto: UpdateProjectReviewSeriesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.seriesService.update(
      clientId!,
      projectId,
      seriesId,
      dto,
      context,
    );
  }

  @Post(':seriesId/generate')
  @RequirePermissions('projects.update')
  generate(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('seriesId') seriesId: string,
    @Body() dto: GenerateProjectReviewSeriesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.seriesService.generate(
      clientId!,
      projectId,
      seriesId,
      dto ?? {},
      context,
    );
  }
}
