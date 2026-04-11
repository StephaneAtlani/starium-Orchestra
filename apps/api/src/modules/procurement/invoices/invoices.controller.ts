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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicesService } from './invoices.service';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @RequirePermissions('procurement.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.invoices.list(clientId!, query);
  }

  @Get(':id')
  @RequirePermissions('procurement.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.invoices.getById(clientId!, id);
  }

  @Post()
  @RequirePermissions('procurement.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateInvoiceDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.invoices.create(clientId!, dto, { actorUserId, meta });
  }

  @Patch(':id')
  @RequirePermissions('procurement.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.invoices.update(clientId!, id, dto, { actorUserId, meta });
  }

  @Delete(':id')
  @RequirePermissions('procurement.update')
  cancel(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.invoices.cancel(clientId!, id, { actorUserId, meta });
  }
}

