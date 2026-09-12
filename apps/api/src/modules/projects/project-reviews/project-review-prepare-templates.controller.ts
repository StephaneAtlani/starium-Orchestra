import {
  Body,
  Controller,
  Delete,
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
import {
  CreateProjectReviewPrepareTemplateDto,
  UpdateProjectReviewPrepareTemplateDto,
} from './dto/project-review-prepare-template.dto';
import { ProjectReviewPrepareTemplatesService } from './project-review-prepare-templates.service';

@Controller('projects/:projectId/reviews/prepare-templates')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectReviewPrepareTemplatesController {
  constructor(
    private readonly templatesService: ProjectReviewPrepareTemplatesService,
  ) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Query('typeCode') typeCode?: string,
  ) {
    return this.templatesService.list(clientId!, projectId, typeCode);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectReviewPrepareTemplateDto,
  ) {
    return this.templatesService.create(clientId!, projectId, dto);
  }

  @Patch(':templateId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateProjectReviewPrepareTemplateDto,
  ) {
    return this.templatesService.update(
      clientId!,
      projectId,
      templateId,
      dto,
    );
  }

  @Delete(':templateId')
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
  ) {
    return this.templatesService.remove(clientId!, projectId, templateId);
  }
}
