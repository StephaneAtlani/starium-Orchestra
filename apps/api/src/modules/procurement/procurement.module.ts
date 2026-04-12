import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FinancialCoreModule } from '../financial-core/financial-core.module';
import { MicrosoftModule } from '../microsoft/microsoft.module';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
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
import { SupplierContactsPhotoStorageService } from './supplier-contacts/supplier-contacts-photo.storage';
import { SupplierContactsService } from './supplier-contacts/supplier-contacts.service';
import { LocalProcurementBlobStorageService } from './s3/local-procurement-blob-storage.service';
import { ProcurementS3ConfigResolverService } from './s3/procurement-s3-config.resolver.service';
import { ProcurementObjectStorageService } from './s3/procurement-object-storage.service';
import { ProcurementStorageResolutionService } from './s3/procurement-storage-resolution.service';
import { S3ProcurementBlobStorageService } from './s3/s3-procurement-blob-storage.service';
import { PlatformProcurementS3SettingsService } from './s3/platform-procurement-s3-settings.service';
import { PlatformProcurementS3SettingsController } from './s3/platform-procurement-s3-settings.controller';
import { ProcurementAttachmentsService } from './attachments/procurement-attachments.service';
import { PurchaseOrderAttachmentsController } from './attachments/purchase-order-attachments.controller';
import { InvoiceAttachmentsController } from './attachments/invoice-attachments.controller';
import { PlatformUploadModule } from '../platform-upload/platform-upload.module';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    FinancialCoreModule,
    MicrosoftModule,
    PlatformUploadModule,
  ],
  controllers: [
    PlatformProcurementS3SettingsController,
    PurchaseOrderAttachmentsController,
    InvoiceAttachmentsController,
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
    PlatformAdminGuard,
    ProcurementS3ConfigResolverService,
    ProcurementStorageResolutionService,
    LocalProcurementBlobStorageService,
    S3ProcurementBlobStorageService,
    ProcurementObjectStorageService,
    PlatformProcurementS3SettingsService,
    ProcurementAttachmentsService,
    SuppliersService,
    PurchaseOrdersService,
    InvoicesService,
    SupplierCategoriesService,
    SuppliersLogoStorageService,
    SupplierContactsPhotoStorageService,
    SupplierContactsService,
  ],
  exports: [
    SuppliersService,
    PurchaseOrdersService,
    InvoicesService,
    SupplierCategoriesService,
    SuppliersLogoStorageService,
    SupplierContactsPhotoStorageService,
    SupplierContactsService,
  ],
})
export class ProcurementModule {}

