import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RunDirectorySyncDto } from './dto/run-directory-sync.dto';
import { TeamDirectoryService } from './team-directory.service';

@Controller('team-directory/ad-sync')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
export class DirectorySyncController {
  constructor(private readonly directory: TeamDirectoryService) {}

  @Post('preview')
  preview(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: RunDirectorySyncDto,
  ) {
    return this.directory.previewSync(clientId!, dto);
  }

  @Post('execute')
  execute(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: RunDirectorySyncDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.directory.executeSync(clientId!, dto, actorUserId, meta);
  }

  @Get('jobs')
  listJobs(@ActiveClientId() clientId: string | undefined) {
    return this.directory.listJobs(clientId!);
  }

  @Get('jobs/:id')
  getJob(@ActiveClientId() clientId: string | undefined, @Param('id') id: string) {
    return this.directory.getJob(clientId!, id);
  }

  @Get('provider-groups')
  listProviderGroups(
    @ActiveClientId() clientId: string | undefined,
    @Query('connectionId') connectionId: string,
  ) {
    return this.directory.listProviderGroups(clientId!, connectionId);
  }
}
