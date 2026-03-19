import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';
import { InvoicesService } from './invoices/invoices.service';
import { ListPurchaseOrdersQueryDto } from './purchase-orders/dto/list-purchase-orders.query.dto';
import { ListInvoicesQueryDto } from './invoices/dto/list-invoices.query.dto';

@Controller('budget-lines')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class BudgetLinesProcurementController {
  constructor(
    private readonly orders: PurchaseOrdersService,
    private readonly invoices: InvoicesService,
  ) {}

  @Get(':id/purchase-orders')
  @RequirePermissions('procurement.read')
  listForBudgetLineOrders(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') budgetLineId: string,
    @Query() query: ListPurchaseOrdersQueryDto,
  ) {
    return this.orders.listByBudgetLine(clientId!, budgetLineId, {
      limit: query.limit,
      offset: query.offset,
      includeCancelled: query.includeCancelled,
    });
  }

  @Get(':id/invoices')
  @RequirePermissions('procurement.read')
  listForBudgetLineInvoices(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') budgetLineId: string,
    @Query() query: ListInvoicesQueryDto,
  ) {
    return this.invoices.listByBudgetLine(clientId!, budgetLineId, {
      limit: query.limit,
      offset: query.offset,
      includeCancelled: query.includeCancelled,
    });
  }
}

