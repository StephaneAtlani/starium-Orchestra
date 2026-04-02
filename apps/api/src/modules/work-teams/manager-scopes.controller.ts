import {
  Body,
  Controller,
  Get,
  Param,
  Put,
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
import { PreviewManagerScopeQueryDto } from './dto/preview-manager-scope.query.dto';
import { PutManagerScopeDto } from './dto/put-manager-scope.dto';
import { ManagerScopesService } from './manager-scopes.service';

@Controller('manager-scopes')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ManagerScopesController {
  constructor(private readonly managerScopes: ManagerScopesService) {}

  @Get(':managerCollaboratorId/preview')
  @RequirePermissions('teams.read')
  preview(
    @ActiveClientId() clientId: string | undefined,
    @Param('managerCollaboratorId') managerCollaboratorId: string,
    @Query() query: PreviewManagerScopeQueryDto,
  ) {
    return this.managerScopes.preview(clientId!, managerCollaboratorId, query);
  }

  @Get(':managerCollaboratorId')
  @RequirePermissions('teams.read')
  get(
    @ActiveClientId() clientId: string | undefined,
    @Param('managerCollaboratorId') managerCollaboratorId: string,
  ) {
    return this.managerScopes.get(clientId!, managerCollaboratorId);
  }

  @Put(':managerCollaboratorId')
  @RequirePermissions('teams.manage_scopes')
  put(
    @ActiveClientId() clientId: string | undefined,
    @Param('managerCollaboratorId') managerCollaboratorId: string,
    @Body() dto: PutManagerScopeDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.managerScopes.put(
      clientId!,
      managerCollaboratorId,
      dto,
      actorUserId,
      meta,
    );
  }
}
