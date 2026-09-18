import {
  Body,
  Controller,
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
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { ListProceduresQueryDto } from './dto/list-procedures.query.dto';
import { TransitionProcedureDto } from './dto/transition-procedure.dto';
import { UpdateProcedureDraftDto } from './dto/update-procedure-draft.dto';
import { ProceduresService } from './procedures.service';
import { ProcedureSettingsService } from './procedure-settings.service';
import { ProcedureCategoriesService } from './procedure-categories.service';
import { UpdateProcedureSettingsDto } from './dto/update-procedure-settings.dto';
import {
  CreateProcedureCategoryDto,
  UpdateProcedureCategoryDto,
} from './dto/procedure-category.dto';

@Controller('procedures')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProceduresController {
  constructor(
    private readonly proceduresService: ProceduresService,
    private readonly settingsService: ProcedureSettingsService,
    private readonly categoriesService: ProcedureCategoriesService,
  ) {}

  @Get()
  @RequirePermissions('procedures.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListProceduresQueryDto,
  ) {
    return this.proceduresService.list(clientId!, query);
  }

  @Get('settings')
  @RequirePermissions('procedures.read')
  getSettings(@ActiveClientId() clientId: string | undefined) {
    return this.settingsService.getOrCreate(clientId!);
  }

  @Patch('settings')
  @RequirePermissions('procedures.configure')
  updateSettings(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: UpdateProcedureSettingsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.settingsService.update(clientId!, dto, actorUserId, meta);
  }

  @Get('categories')
  @RequirePermissions('procedures.read')
  listCategories(
    @ActiveClientId() clientId: string | undefined,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.categoriesService.list(clientId!, {
      activeOnly: activeOnly === 'true' || activeOnly === '1',
    });
  }

  @Post('categories')
  @RequirePermissions('procedures.configure')
  createCategory(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateProcedureCategoryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.categoriesService.create(clientId!, dto, actorUserId, meta);
  }

  @Patch('categories/:categoryId')
  @RequirePermissions('procedures.configure')
  updateCategory(
    @ActiveClientId() clientId: string | undefined,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateProcedureCategoryDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.categoriesService.update(
      clientId!,
      categoryId,
      dto,
      actorUserId,
      meta,
    );
  }

  @Post()
  @RequirePermissions('procedures.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateProcedureDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.proceduresService.create(clientId!, dto, actorUserId, meta);
  }

  @Get(':id')
  @RequirePermissions('procedures.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.proceduresService.getById(clientId!, id);
  }

  @Patch(':id/draft')
  @RequirePermissions('procedures.update')
  updateDraft(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateProcedureDraftDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.proceduresService.updateDraft(
      clientId!,
      id,
      dto,
      actorUserId,
      meta,
    );
  }

  @Post(':id/transition')
  @RequirePermissions('procedures.update')
  transition(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: TransitionProcedureDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.proceduresService.transition(
      clientId!,
      id,
      dto,
      actorUserId,
      meta,
    );
  }

  @Post(':id/archive')
  @RequirePermissions('procedures.archive')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.proceduresService.archive(clientId!, id, actorUserId, meta);
  }

  @Post(':id/unarchive')
  @RequirePermissions('procedures.archive')
  unarchive(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.proceduresService.unarchive(clientId!, id, actorUserId, meta);
  }
}
