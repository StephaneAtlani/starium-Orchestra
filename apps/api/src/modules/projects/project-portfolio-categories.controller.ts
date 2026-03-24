import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateProjectPortfolioCategoryDto } from './dto/create-project-portfolio-category.dto';
import { ReorderProjectPortfolioCategoriesDto } from './dto/reorder-project-portfolio-categories.dto';
import { UpdateProjectPortfolioCategoryDto } from './dto/update-project-portfolio-category.dto';
import { ProjectPortfolioCategoriesService } from './project-portfolio-categories.service';

@Controller('projects/options/portfolio-categories')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectPortfolioCategoriesController {
  constructor(
    private readonly categoriesService: ProjectPortfolioCategoriesService,
  ) {}

  @Get()
  @RequirePermissions('projects.read')
  list(@ActiveClientId() clientId: string | undefined) {
    return this.categoriesService.list(clientId!);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.categoriesService.getById(clientId!, id);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateProjectPortfolioCategoryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.categoriesService.create(clientId!, dto, context);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateProjectPortfolioCategoryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.categoriesService.update(clientId!, id, dto, context);
  }

  @Post('reorder')
  @RequirePermissions('projects.update')
  reorder(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: ReorderProjectPortfolioCategoriesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.categoriesService.reorder(clientId!, dto, context);
  }

  @Delete(':id')
  @RequirePermissions('projects.update')
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    await this.categoriesService.remove(clientId!, id, context);
  }
}
