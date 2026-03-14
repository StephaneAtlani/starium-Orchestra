import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { FinancialEventsService } from './financial-events.service';
import { CreateFinancialEventDto } from './dto/create-financial-event.dto';
import { ListFinancialEventsQueryDto } from './dto/list-financial-events.query.dto';

@Controller('financial-events')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class FinancialEventsController {
  constructor(private readonly events: FinancialEventsService) {}

  @Get()
  @RequirePermissions('budgets.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListFinancialEventsQueryDto,
  ) {
    return this.events.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('budgets.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateFinancialEventDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.events.create(clientId!, dto, {
      actorUserId,
      meta,
    });
  }
}
