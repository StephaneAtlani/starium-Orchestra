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
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDirectoryConnectionDto } from './dto/create-directory-connection.dto';
import { CreateDirectoryGroupScopeDto } from './dto/create-directory-group-scope.dto';
import { UpdateDirectoryConnectionDto } from './dto/update-directory-connection.dto';
import { DirectoryConnectionsService } from './directory-connections.service';
import { TeamDirectoryService } from './team-directory.service';

@Controller('team-directory/ad-connections')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
export class DirectoryConnectionsController {
  constructor(
    private readonly connections: DirectoryConnectionsService,
    private readonly directory: TeamDirectoryService,
  ) {}

  @Get()
  list(@ActiveClientId() clientId: string | undefined) {
    return this.connections.listConnections(clientId!);
  }

  @Post()
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateDirectoryConnectionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.connections.createConnection(clientId!, dto, actorUserId, meta);
  }

  @Patch(':id')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateDirectoryConnectionDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.connections.updateConnection(clientId!, id, dto, actorUserId, meta);
  }

  @Post(':id/test')
  test(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.directory.testConnection(clientId!, id, actorUserId, meta);
  }

  @Get(':id/groups')
  listGroups(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.connections.listGroupScopes(clientId!, id);
  }

  @Post(':id/groups')
  addGroup(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: CreateDirectoryGroupScopeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.connections.addGroupScope(clientId!, id, dto, actorUserId, meta);
  }

  @Delete(':id/groups/:groupScopeId')
  async deleteGroup(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Param('groupScopeId') groupScopeId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    await this.connections.deleteGroupScope(
      clientId!,
      id,
      groupScopeId,
      actorUserId,
      meta,
    );
    return { success: true };
  }
}
