import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
import { ProceduresService } from './procedures.service';

@Controller('procedures')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Get()
  @RequirePermissions('procedures.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListProceduresQueryDto,
  ) {
    return this.proceduresService.list(clientId!, query);
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
