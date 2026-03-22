import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { CreateProjectBudgetLinkDto } from './dto/create-project-budget-link.dto';
import { ListProjectBudgetLinksQueryDto } from './dto/list-project-budget-links.query.dto';
import { ProjectBudgetLinksService } from './project-budget-links.service';

/**
 * RFC-PROJ-010 : sous-ressource projet.
 * Permissions : RFC §7.3 mentionne `projects.update` + `budgets.read` ; le PermissionsGuard
 * n’autorise qu’un seul préfixe module par route — on utilise `projects.read` / `projects.update`
 * comme les autres sous-ressources (tâches, risques).
 */
@Controller('projects/:projectId/budget-links')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectBudgetLinksController {
  constructor(private readonly linksService: ProjectBudgetLinksService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Query() query: ListProjectBudgetLinksQueryDto,
  ) {
    return this.linksService.list(clientId!, projectId, query);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectBudgetLinkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: {
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.linksService.create(clientId!, projectId, dto, context);
  }
}
