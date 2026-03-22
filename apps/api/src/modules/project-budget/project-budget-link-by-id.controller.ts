import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ProjectBudgetLinksService } from './project-budget-links.service';
import { UpdateProjectBudgetLinkDto } from './dto/update-project-budget-link.dto';

@Controller('project-budget-links')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectBudgetLinkByIdController {
  constructor(private readonly linksService: ProjectBudgetLinksService) {}

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateProjectBudgetLinkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: {
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.linksService.update(clientId!, id, dto, context);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: {
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.linksService.remove(clientId!, id, context);
  }
}
