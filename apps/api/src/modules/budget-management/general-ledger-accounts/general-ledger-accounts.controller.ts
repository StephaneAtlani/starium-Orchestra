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
import { GeneralLedgerAccountsService } from './general-ledger-accounts.service';
import { CreateGeneralLedgerAccountDto } from './dto/create-general-ledger-account.dto';
import { ListGeneralLedgerAccountsQueryDto } from './dto/list-general-ledger-accounts.query.dto';
import { UpdateGeneralLedgerAccountDto } from './dto/update-general-ledger-account.dto';

@Controller('general-ledger-accounts')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class GeneralLedgerAccountsController {
  constructor(private readonly service: GeneralLedgerAccountsService) {}

  @Get()
  @RequirePermissions('budgets.general-ledger-accounts.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListGeneralLedgerAccountsQueryDto,
  ) {
    return this.service.list(clientId!, query);
  }

  @Get(':id')
  @RequirePermissions('budgets.general-ledger-accounts.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.getById(clientId!, id);
  }

  @Post()
  @RequirePermissions('budgets.general-ledger-accounts.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateGeneralLedgerAccountDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.create(clientId!, dto, context);
  }

  @Patch(':id')
  @RequirePermissions('budgets.general-ledger-accounts.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateGeneralLedgerAccountDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.service.update(clientId!, id, dto, context);
  }
}
