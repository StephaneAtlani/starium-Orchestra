import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { ListPurchaseOrdersQueryDto } from './purchase-orders/dto/list-purchase-orders.query.dto';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';
import { InvoicesService } from './invoices/invoices.service';
import { ListInvoicesQueryDto } from './invoices/dto/list-invoices.query.dto';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class SuppliersProcurementController {
  constructor(
    private readonly orders: PurchaseOrdersService,
    private readonly invoices: InvoicesService,
  ) {}

  @Get(':id/purchase-orders')
  @RequirePermissions('procurement.read')
  listSupplierOrders(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') supplierId: string,
    @Query() query: ListPurchaseOrdersQueryDto,
  ) {
    return this.orders.listBySupplier(clientId!, supplierId, {
      limit: query.limit,
      offset: query.offset,
      includeCancelled: query.includeCancelled,
    });
  }

  @Get(':id/invoices')
  @RequirePermissions('procurement.read')
  listSupplierInvoices(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') supplierId: string,
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.invoices.listBySupplier(clientId!, supplierId, {
      limit: query.limit,
      offset: query.offset,
      includeCancelled: query.includeCancelled,
    });
  }
}

