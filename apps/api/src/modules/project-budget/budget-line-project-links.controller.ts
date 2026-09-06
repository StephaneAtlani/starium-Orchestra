import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { ListBudgetLineProjectLinksQueryDto } from './dto/list-budget-line-project-links.query.dto';
import { ProjectBudgetLinksService } from './project-budget-links.service';

/**
 * RFC-PROJ-010-B lot A — vue inverse ligne → projets.
 */
@Controller('budget-lines/:budgetLineId/project-links')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetLineProjectLinksController {
  constructor(private readonly linksService: ProjectBudgetLinksService) {}

  @Get()
  @RequirePermissions('budgets.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('budgetLineId') budgetLineId: string,
    @Query() query: ListBudgetLineProjectLinksQueryDto,
  ) {
    return this.linksService.listByBudgetLine(clientId!, budgetLineId, query);
  }
}
