import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions('notifications.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.list(clientId!, userId!, query);
  }

  @Patch('read-all')
  @RequirePermissions('notifications.update')
  markAllRead(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.notificationsService.markAllRead(clientId!, userId!);
  }

  @Patch(':id/read')
  @RequirePermissions('notifications.update')
  markRead(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(clientId!, userId!, id);
  }

  @Delete()
  @RequirePermissions('notifications.update')
  clearAll(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.notificationsService.clearAll(clientId!, userId!);
  }

  @Delete(':id')
  @RequirePermissions('notifications.update')
  clearOne(
    @ActiveClientId() clientId: string | undefined,
    @RequestUserId() userId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.notificationsService.clearOne(clientId!, userId!, id);
  }
}
