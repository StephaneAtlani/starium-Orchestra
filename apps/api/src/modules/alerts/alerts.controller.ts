import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetAlertsQueryDto } from './dto/get-alerts-query.dto';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @RequirePermissions('alerts.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: GetAlertsQueryDto,
  ) {
    return this.alertsService.list(clientId!, query);
  }

  @Patch(':id/resolve')
  @RequirePermissions('alerts.update')
  resolve(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.alertsService.resolve(clientId!, id, actorUserId, meta);
  }

  @Patch(':id/dismiss')
  @RequirePermissions('alerts.update')
  dismiss(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.alertsService.dismiss(clientId!, id, actorUserId, meta);
  }
}
