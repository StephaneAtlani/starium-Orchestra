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
import { AnalyticalLedgerAccountsService } from './analytical-ledger-accounts.service';
import { CreateAnalyticalLedgerAccountDto } from './dto/create-analytical-ledger-account.dto';
import { ListAnalyticalLedgerAccountsQueryDto } from './dto/list-analytical-ledger-accounts.query.dto';
import { UpdateAnalyticalLedgerAccountDto } from './dto/update-analytical-ledger-account.dto';

@Controller('analytical-ledger-accounts')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class AnalyticalLedgerAccountsController {
  constructor(private readonly service: AnalyticalLedgerAccountsService) {}

  @Get()
  @RequirePermissions('budgets.analytical-ledger-accounts.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListAnalyticalLedgerAccountsQueryDto,
  ) {
    return this.service.list(clientId!, query);
  }

  @Get(':id')
  @RequirePermissions('budgets.analytical-ledger-accounts.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getById(clientId!, id);
  }

  @Post()
  @RequirePermissions('budgets.analytical-ledger-accounts.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateAnalyticalLedgerAccountDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.create(clientId!, dto, context);
  }

  @Patch(':id')
  @RequirePermissions('budgets.analytical-ledger-accounts.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateAnalyticalLedgerAccountDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.update(clientId!, id, dto, context);
  }
}
