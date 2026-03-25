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
import { CreateProjectTaskBucketDto } from './dto/create-project-task-bucket.dto';
import { UpdateProjectTaskBucketDto } from './dto/update-project-task-bucket.dto';
import { ProjectTaskBucketsService } from './project-task-buckets.service';

@Controller('projects/:projectId/task-buckets')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectTaskBucketsController {
  constructor(private readonly buckets: ProjectTaskBucketsService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.buckets.list(clientId!, projectId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectTaskBucketDto,
  ) {
    return this.buckets.create(clientId!, projectId, dto);
  }

  @Patch(':bucketId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('bucketId') bucketId: string,
    @Body() dto: UpdateProjectTaskBucketDto,
  ) {
    return this.buckets.update(clientId!, projectId, bucketId, dto);
  }

  @Delete(':bucketId')
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('bucketId') bucketId: string,
  ) {
    return this.buckets.delete(clientId!, projectId, bucketId);
  }
}
