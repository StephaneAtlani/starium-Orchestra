import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateGovernanceCycleDto } from './dto/create-governance-cycle.dto';
import { ListGovernanceCyclesQueryDto } from './dto/list-governance-cycles-query.dto';
import { UpdateGovernanceCycleDto } from './dto/update-governance-cycle.dto';
import { GovernanceCyclesService } from './governance-cycles.service';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
@Controller()
export class GovernanceCyclesController {
  constructor(private readonly service: GovernanceCyclesService) {}

  @Get('governance-cycles')
  @RequirePermissions('governance_cycles.read')
  listCycles(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListGovernanceCyclesQueryDto,
  ) {
    return this.service.listCycles(clientId!, query);
  }

  @Post('governance-cycles')
  @RequirePermissions('governance_cycles.create')
  createCycle(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateGovernanceCycleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.createCycle(clientId!, dto, { actorUserId, meta });
  }

  @Get('governance-cycles/:id')
  @RequirePermissions('governance_cycles.read')
  getCycle(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getCycleById(clientId!, id);
  }

  @Patch('governance-cycles/:id')
  @RequirePermissions('governance_cycles.update')
  updateCycle(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateGovernanceCycleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.updateCycle(clientId!, id, dto, { actorUserId, meta });
  }

  @Delete('governance-cycles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('governance_cycles.delete')
  archiveCycle(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditMeta,
  ) {
    return this.service.archiveCycle(clientId!, id, { actorUserId, meta });
  }
}
