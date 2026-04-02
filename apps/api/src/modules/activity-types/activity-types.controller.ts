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
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityTypesService } from './activity-types.service';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { ListActivityTypesQueryDto } from './dto/list-activity-types.query.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';

@Controller('activity-types')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
export class ActivityTypesController {
  constructor(private readonly activityTypes: ActivityTypesService) {}

  @Get()
  @RequirePermissions('activity_types.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListActivityTypesQueryDto,
  ) {
    return this.activityTypes.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('activity_types.manage')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateActivityTypeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.activityTypes.create(clientId!, dto, actorUserId, meta);
  }

  @Get(':id')
  @RequirePermissions('activity_types.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.activityTypes.getById(clientId!, id);
  }

  @Patch(':id')
  @RequirePermissions('activity_types.manage')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateActivityTypeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.activityTypes.update(clientId!, id, dto, actorUserId, meta);
  }

  @Patch(':id/archive')
  @RequirePermissions('activity_types.manage')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.activityTypes.archive(clientId!, id, actorUserId, meta);
  }

  @Patch(':id/restore')
  @RequirePermissions('activity_types.manage')
  restore(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.activityTypes.restore(clientId!, id, actorUserId, meta);
  }
}
