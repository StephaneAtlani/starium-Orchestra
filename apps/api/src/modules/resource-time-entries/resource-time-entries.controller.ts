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
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateResourceTimeEntryDto } from './dto/create-resource-time-entry.dto';
import { ListResourceTimeEntriesQueryDto } from './dto/list-resource-time-entries.query.dto';
import { UpdateResourceTimeEntryDto } from './dto/update-resource-time-entry.dto';
import { ResourceTimeEntriesService } from './resource-time-entries.service';

@Controller('resource-time-entries')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
export class ResourceTimeEntriesController {
  constructor(private readonly entries: ResourceTimeEntriesService) {}

  @Get()
  @RequirePermissions('resources.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListResourceTimeEntriesQueryDto,
  ) {
    return this.entries.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('resources.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateResourceTimeEntryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.entries.create(clientId!, dto, actorUserId, meta);
  }

  @Get(':id')
  @RequirePermissions('resources.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.entries.getById(clientId!, id);
  }

  @Patch(':id')
  @RequirePermissions('resources.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateResourceTimeEntryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.entries.update(clientId!, id, dto, actorUserId, meta);
  }

  @Delete(':id')
  @RequirePermissions('resources.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.entries.remove(clientId!, id, actorUserId, meta);
  }
}
