import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FinancialCoreModule } from '../financial-core/financial-core.module';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { PurchaseOrdersController } from './purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';
import { InvoicesController } from './invoices/invoices.controller';
import { InvoicesService } from './invoices/invoices.service';
import { BudgetLinesProcurementController } from './budget-lines-procurement.controller';
import { SuppliersProcurementController } from './suppliers-procurement.controller';
import { SupplierCategoriesController } from './supplier-categories/supplier-categories.controller';
import { SupplierCategoriesService } from './supplier-categories/supplier-categories.service';
import { SuppliersLogoStorageService } from './suppliers/suppliers-logo.storage';
import { SupplierContactsController } from './supplier-contacts/supplier-contacts.controller';
import { SupplierContactsListController } from './supplier-contacts/supplier-contacts-list.controller';
import { SupplierContactsService } from './supplier-contacts/supplier-contacts.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, FinancialCoreModule],
  controllers: [
    SuppliersController,
    PurchaseOrdersController,
    InvoicesController,
    BudgetLinesProcurementController,
    SuppliersProcurementController,
    SupplierCategoriesController,
    SupplierContactsController,
    SupplierContactsListController,
  ],
  providers: [
    SuppliersService,
    PurchaseOrdersService,
    InvoicesService,
    SupplierCategoriesService,
    SuppliersLogoStorageService,
    SupplierContactsService,
  ],
  exports: [
    SuppliersService,
    PurchaseOrdersService,
    InvoicesService,
    SupplierCategoriesService,
    SuppliersLogoStorageService,
    SupplierContactsService,
  ],
})
export class ProcurementModule {}

