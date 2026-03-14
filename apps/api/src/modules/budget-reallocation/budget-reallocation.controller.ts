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
import { BudgetReallocationService } from './budget-reallocation.service';
import { CreateReallocationDto } from './dto/create-reallocation.dto';
import { ListReallocationQueryDto } from './dto/list-reallocation.query.dto';
import type { CreateReallocationContext } from './types/budget-reallocation.types';

@Controller('budget-reallocations')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetReallocationController {
  constructor(private readonly service: BudgetReallocationService) {}

  @Post()
  @RequirePermissions('budgets.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateReallocationDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string } | undefined,
  ) {
    const context: CreateReallocationContext = { actorUserId, meta };
    return this.service.create(clientId!, dto, context);
  }

  @Get()
  @RequirePermissions('budgets.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListReallocationQueryDto,
  ) {
    return this.service.list(clientId!, query);
  }

  @Get(':id')
  @RequirePermissions('budgets.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getById(clientId!, id);
  }
}
