import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateTeamsChannelTemplateDto } from './dto/create-teams-channel-template.dto';
import { ReorderTeamsChannelTemplatesDto } from './dto/reorder-teams-channel-templates.dto';
import { UpdateTeamsChannelTemplateDto } from './dto/update-teams-channel-template.dto';
import { UpdateTeamsProvisioningSettingsDto } from './dto/update-teams-provisioning-settings.dto';
import { ProjectMicrosoftTeamsTemplateService } from './project-microsoft-teams-template.service';

@Controller('projects/options')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectMicrosoftTeamsTemplateController {
  constructor(
    private readonly templateService: ProjectMicrosoftTeamsTemplateService,
  ) {}

  @Get('microsoft-teams-provisioning')
  @RequirePermissions('projects.read')
  getSettings(@ActiveClientId() clientId: string | undefined) {
    return this.templateService.getSettings(clientId!);
  }

  @Put('microsoft-teams-provisioning')
  @RequirePermissions('projects.update')
  updateSettings(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: UpdateTeamsProvisioningSettingsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.templateService.updateSettings(clientId!, dto, context);
  }

  @Get('microsoft-teams-channels')
  @RequirePermissions('projects.read')
  listChannelTemplates(@ActiveClientId() clientId: string | undefined) {
    return this.templateService.listChannelTemplates(clientId!);
  }

  @Post('microsoft-teams-channels')
  @RequirePermissions('projects.update')
  createChannelTemplate(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateTeamsChannelTemplateDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.templateService.createChannelTemplate(clientId!, dto, context);
  }

  @Put('microsoft-teams-channels/reorder')
  @RequirePermissions('projects.update')
  reorderChannelTemplates(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: ReorderTeamsChannelTemplatesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.templateService.reorderChannelTemplates(clientId!, dto, context);
  }

  @Patch('microsoft-teams-channels/:id')
  @RequirePermissions('projects.update')
  updateChannelTemplate(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateTeamsChannelTemplateDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.templateService.updateChannelTemplate(clientId!, id, dto, context);
  }

  @Delete('microsoft-teams-channels/:id')
  @RequirePermissions('projects.update')
  removeChannelTemplate(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.templateService.deleteChannelTemplate(clientId!, id, context);
  }
}
