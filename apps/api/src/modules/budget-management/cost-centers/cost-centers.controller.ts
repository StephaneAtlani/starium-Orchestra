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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../types/audit-context';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { ListCostCentersQueryDto } from './dto/list-cost-centers.query.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

@Controller('cost-centers')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class CostCentersController {
  constructor(private readonly service: CostCentersService) {}

  @Get()
  @RequirePermissions('budgets.cost-centers.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListCostCentersQueryDto,
  ) {
    return this.service.list(clientId!, query);
  }

  @Get(':id')
  @RequirePermissions('budgets.cost-centers.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getById(clientId!, id);
  }

  @Post()
  @RequirePermissions('budgets.cost-centers.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateCostCenterDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.create(clientId!, dto, context);
  }

  @Patch(':id')
  @RequirePermissions('budgets.cost-centers.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.update(clientId!, id, dto, context);
  }
}
