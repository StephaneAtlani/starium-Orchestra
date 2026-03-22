import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../../budget-management/types/audit-context';
import { SetArbitrationDto } from './dto/set-arbitration.dto';
import { UpdateProjectSheetDto } from './dto/update-project-sheet.dto';
import { ProjectSheetService } from './project-sheet.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectSheetController {
  constructor(private readonly projectSheetService: ProjectSheetService) {}

  @Get(':id/project-sheet')
  @RequirePermissions('projects.read')
  getSheet(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.projectSheetService.getSheet(clientId!, id);
  }

  @Patch(':id/project-sheet')
  @RequirePermissions('projects.update')
  updateSheet(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateProjectSheetDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectSheetService.updateSheet(clientId!, id, dto, context);
  }

  @Post(':id/arbitration')
  @RequirePermissions('projects.update')
  setArbitration(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: SetArbitrationDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectSheetService.setArbitrationStatus(clientId!, id, dto, context);
  }
}
