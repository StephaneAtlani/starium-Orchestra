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
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateProcedureTemplateDto,
  TransitionProcedureTemplateDto,
  UpdateProcedureTemplateDto,
} from './dto/procedure-template.dto';
import { ProcedureTemplatesService } from './procedure-templates.service';

@Controller('procedure-templates')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProcedureTemplatesController {
  constructor(private readonly templates: ProcedureTemplatesService) {}

  @Get()
  @RequirePermissions('procedures.templates.manage')
  list(@ActiveClientId() clientId: string | undefined) {
    return this.templates.list(clientId!);
  }

  /** Picker création procédure — modèles ACTIVE uniquement. */
  @Get('active')
  @RequireAnyPermissions(
    'procedures.create',
    'procedures.templates.manage',
  )
  listActive(@ActiveClientId() clientId: string | undefined) {
    return this.templates.listActive(clientId!);
  }

  @Post()
  @RequirePermissions('procedures.templates.manage')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateProcedureTemplateDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.templates.create(clientId!, dto, actorUserId, meta);
  }

  @Get(':templateId')
  @RequirePermissions('procedures.templates.manage')
  get(
    @ActiveClientId() clientId: string | undefined,
    @Param('templateId') templateId: string,
  ) {
    return this.templates.get(clientId!, templateId);
  }

  @Patch(':templateId')
  @RequirePermissions('procedures.templates.manage')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateProcedureTemplateDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.templates.update(clientId!, templateId, dto, actorUserId, meta);
  }

  @Post(':templateId/transition')
  @RequirePermissions('procedures.templates.manage')
  transition(
    @ActiveClientId() clientId: string | undefined,
    @Param('templateId') templateId: string,
    @Body() dto: TransitionProcedureTemplateDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.templates.transition(
      clientId!,
      templateId,
      dto,
      actorUserId,
      meta,
    );
  }

  @Delete(':templateId')
  @RequirePermissions('procedures.templates.manage')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('templateId') templateId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.templates.remove(clientId!, templateId, actorUserId, meta);
  }
}
