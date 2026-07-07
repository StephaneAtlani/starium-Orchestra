import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ClientAdminOrPlatformAdminGuard } from '../../common/guards/client-admin-or-platform-admin.guard';
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ClientStrategicDirectionStrategyWorkflowSettingsService } from './client-strategic-direction-strategy-workflow-settings.service';
import { UpdateClientStrategicDirectionStrategyWorkflowSettingsDto } from './dto/update-client-strategic-direction-strategy-workflow-settings.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ClientStrategicDirectionStrategyWorkflowSettingsController {
  constructor(
    private readonly settings: ClientStrategicDirectionStrategyWorkflowSettingsService,
  ) {}

  @Get('active/strategic-direction-strategy-workflow-settings')
  @RequireAnyPermissions(
    'strategic_direction_strategy.read',
    'strategic_direction_strategy.update',
  )
  getActive(@ActiveClientId() clientId: string | undefined) {
    return this.settings.getActive(clientId!);
  }

  @Patch('active/strategic-direction-strategy-workflow-settings')
  @UseGuards(ClientAdminOrPlatformAdminGuard)
  updateActive(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: UpdateClientStrategicDirectionStrategyWorkflowSettingsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.settings.updateActive(clientId!, dto, {
      actorUserId,
      meta,
    });
  }
}
