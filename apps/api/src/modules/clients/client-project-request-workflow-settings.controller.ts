import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ClientAdminOrPlatformAdminGuard } from '../../common/guards/client-admin-or-platform-admin.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ClientProjectRequestWorkflowSettingsService } from './client-project-request-workflow-settings.service';
import { UpdateClientProjectRequestWorkflowSettingsDto } from './dto/update-client-project-request-workflow-settings.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ClientProjectRequestWorkflowSettingsController {
  constructor(
    private readonly settings: ClientProjectRequestWorkflowSettingsService,
  ) {}

  @Get('active/project-request-workflow-settings')
  @RequireAnyPermissions(
    'project_requests.settings.manage',
    'project_requests.read',
  )
  getActive(@ActiveClientId() clientId: string | undefined) {
    return this.settings.getActive(clientId!);
  }

  @Patch('active/project-request-workflow-settings')
  @UseGuards(ClientAdminOrPlatformAdminGuard)
  updateActive(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: UpdateClientProjectRequestWorkflowSettingsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.settings.updateActive(clientId!, dto, {
      actorUserId,
      meta,
    });
  }
}
