import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateSkillCategoryDto } from './dto/create-skill-category.dto';
import { ListSkillCategoriesQueryDto } from './dto/list-skill-categories.query.dto';
import { ListSkillCategoryOptionsQueryDto } from './dto/list-skill-category-options.query.dto';
import { UpdateSkillCategoryDto } from './dto/update-skill-category.dto';
import { SkillsService } from './skills.service';

@Controller('skill-categories')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class SkillCategoriesController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('options')
  @RequirePermissions('skills.read')
  listOptions(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListSkillCategoryOptionsQueryDto,
  ) {
    return this.skillsService.listSkillCategoryOptions(clientId!, query);
  }

  @Get()
  @RequirePermissions('skills.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListSkillCategoriesQueryDto,
  ) {
    return this.skillsService.listSkillCategories(clientId!, query);
  }

  @Post()
  @RequirePermissions('skills.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateSkillCategoryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.skillsService.createSkillCategory(clientId!, dto, actorUserId, meta);
  }

  @Get(':id')
  @RequirePermissions('skills.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.skillsService.getSkillCategoryById(clientId!, id);
  }

  @Patch(':id')
  @RequirePermissions('skills.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateSkillCategoryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.skillsService.updateSkillCategory(clientId!, id, dto, actorUserId, meta);
  }

  @Delete(':id')
  @RequirePermissions('skills.delete')
  delete(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.skillsService.deleteSkillCategory(clientId!, id, actorUserId, meta);
  }
}
