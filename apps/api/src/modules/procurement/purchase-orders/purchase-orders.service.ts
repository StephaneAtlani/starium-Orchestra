import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FinancialEventType,
  FinancialSourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FinancialEventsService } from '../../financial-core/events/financial-events.service';
import { TaxCalculator } from '../../financial-core/helpers/tax-calculator';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { SuppliersService, ProcurementAuditContext } from '../suppliers/suppliers.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders.query.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

interface SupplierMini {
  id: string;
  name: string;
}

export interface PurchaseOrderResponse {
  id: string;
  clientId: string;
  supplierId: string;
  supplier: SupplierMini;
  budgetLineId: string | null;
  reference: string;
  label: string;
  amountHt: number;
  taxRate: number | null;
  taxAmount: number | null;
  amountTtc: number | null;
  orderDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListPurchaseOrdersResult {
  items: PurchaseOrderResponse[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: FinancialEventsService,
    private readonly auditLogs: AuditLogsService,
    private readonly suppliers: SuppliersService,
  ) {}

  async list(
    clientId: string,
    query: ListPurchaseOrdersQueryDto,
  ): Promise<ListPurchaseOrdersResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const prisma = this.prisma as any;
    const where: any = {
      clientId,
      ...(query.includeCancelled
        ? {}
        : { status: { not: 'CANCELLED' } }),
      ...(query.supplierId && { supplierId: query.supplierId }),
      ...(query.budgetLineId && { budgetLineId: query.budgetLineId }),
      ...(query.status && { status: query.status }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { label: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
        { supplier: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { items: items.map(toPurchaseOrderResponse), total, limit, offset };
  }

  async listBySupplier(
    clientId: string,
    supplierId: string,
    query: { limit?: number; offset?: number; includeCancelled?: boolean },
  ): Promise<ListPurchaseOrdersResult> {
    return this.list(clientId, {
      supplierId,
      includeCancelled: query.includeCancelled,
      limit: query.limit,
      offset: query.offset,
    });
  }

  async listByBudgetLine(
    clientId: string,
    budgetLineId: string,
    query: { limit?: number; offset?: number; includeCancelled?: boolean },
  ): Promise<ListPurchaseOrdersResult> {
    return this.list(clientId, {
      budgetLineId,
      includeCancelled: query.includeCancelled,
      limit: query.limit,
      offset: query.offset,
    });
  }

  async create(
    clientId: string,
    dto: CreatePurchaseOrderDto,
    context?: ProcurementAuditContext,
  ): Promise<PurchaseOrderResponse> {
    const taxRate = dto.taxRate ? new Prisma.Decimal(dto.taxRate) : null;
    const amountHt = new Prisma.Decimal(dto.amountHt);
    const taxCalc = taxRate
      ? TaxCalculator.fromHtAndTaxRate({ amountHt, taxRate })
      : {
          amountHt: amountHt.toDecimalPlaces(2),
          taxRate: null,
          taxAmount: null,
          amountTtc: null,
        };

    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      const supplier = await this.resolveSupplier(clientId, dto, context);
      const budgetLine = await this.resolveBudgetLine(tx, clientId, dto.budgetLineId);

      const created = await tx.purchaseOrder.create({
        data: {
          clientId,
          supplierId: supplier.id,
          budgetLineId: budgetLine?.id ?? null,
          reference: dto.reference.trim(),
          label: dto.label.trim(),
          amountHt: taxCalc.amountHt,
          taxRate: taxCalc.taxRate,
          taxAmount: taxCalc.taxAmount,
          amountTtc: taxCalc.amountTtc,
          orderDate: dto.orderDate,
          status: 'APPROVED',
        },
        include: { supplier: { select: { id: true, name: true } } },
      });

      if (budgetLine) {
        await this.events.create(
          clientId,
          {
            budgetLineId: budgetLine.id,
            sourceType: FinancialSourceType.PURCHASE_ORDER,
            sourceId: created.id,
            eventType: FinancialEventType.COMMITMENT_REGISTERED,
            amountHt: created.amountHt.toFixed(2),
            ...(created.taxRate
              ? { taxRate: created.taxRate.toFixed(2) }
              : { useDefaultTaxRate: true }),
            currency: budgetLine.currency,
            eventDate: created.orderDate,
            label: created.label,
          },
          context,
        );
      }

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'purchase_order.created',
        resourceType: 'purchase_order',
        resourceId: created.id,
        newValue: {
          reference: created.reference,
          supplierId: created.supplierId,
          budgetLineId: created.budgetLineId,
          amountHt: Number(created.amountHt),
          status: created.status,
        },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });

      return created;
    });

    return toPurchaseOrderResponse(result);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
    context?: ProcurementAuditContext,
  ): Promise<PurchaseOrderResponse> {
    const prisma = this.prisma as any;
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, clientId },
      include: { supplier: { select: { id: true, name: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Purchase order not found');
    }
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update a cancelled purchase order');
    }
    if (
      dto.amountHt !== undefined ||
      dto.taxRate !== undefined ||
      dto.taxAmount !== undefined ||
      dto.amountTtc !== undefined ||
      dto.budgetLineId !== undefined
    ) {
      throw new BadRequestException(
        'PATCH purchase-order supports metadata only (label, reference)',
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label.trim() }),
        ...(dto.reference !== undefined && { reference: dto.reference.trim() }),
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'purchase_order.updated',
      resourceType: 'purchase_order',
      resourceId: id,
      oldValue: { label: existing.label, reference: existing.reference },
      newValue: { label: updated.label, reference: updated.reference },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return toPurchaseOrderResponse(updated);
  }

  async cancel(
    clientId: string,
    id: string,
    context?: ProcurementAuditContext,
  ): Promise<PurchaseOrderResponse> {
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      const existing = await tx.purchaseOrder.findFirst({
        where: { id, clientId },
        include: { supplier: { select: { id: true, name: true } } },
      });
      if (!existing) {
        throw new NotFoundException('Purchase order not found');
      }
      if (existing.status === 'CANCELLED') {
        return existing;
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { supplier: { select: { id: true, name: true } } },
      });

      if (updated.budgetLineId) {
        const budgetLine = await tx.budgetLine.findFirst({
          where: { id: updated.budgetLineId, clientId },
          select: { id: true, currency: true },
        });
        if (budgetLine) {
          await this.events.create(
            clientId,
            {
              budgetLineId: budgetLine.id,
              sourceType: FinancialSourceType.PURCHASE_ORDER,
              sourceId: updated.id,
              eventType: FinancialEventType.COMMITMENT_REGISTERED,
              amountHt: updated.amountHt.neg().toFixed(2),
              ...(updated.taxRate
                ? { taxRate: updated.taxRate.toFixed(2) }
                : { useDefaultTaxRate: true }),
              currency: budgetLine.currency,
              eventDate: new Date(),
              label: `Cancellation ${updated.reference}`,
            },
            context,
          );
        }
      }

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'purchase_order.cancelled',
        resourceType: 'purchase_order',
        resourceId: updated.id,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });

      return updated;
    });

    return toPurchaseOrderResponse(result);
  }

  private async resolveBudgetLine(
    tx: any,
    clientId: string,
    budgetLineId?: string,
  ) {
    if (!budgetLineId) return null;
    const budgetLine = await tx.budgetLine.findFirst({
      where: { id: budgetLineId, clientId },
      select: { id: true, currency: true },
    });
    if (!budgetLine) {
      throw new BadRequestException('Budget line not found in active client');
    }
    return budgetLine;
  }

  private async resolveSupplier(
    clientId: string,
    dto: { supplierId?: string; supplierName?: string },
    context?: ProcurementAuditContext,
  ): Promise<SupplierMini> {
    if (dto.supplierId) {
      const supplier = await (this.prisma as any).supplier.findFirst({
        where: { id: dto.supplierId, clientId },
        select: { id: true, name: true, status: true },
      });
      if (!supplier) {
        throw new BadRequestException('Supplier not found in active client');
      }
      if (supplier.status === 'ARCHIVED') {
        throw new BadRequestException('Supplier is archived');
      }
      return { id: supplier.id, name: supplier.name };
    }
    if (dto.supplierName) {
      const supplier = await this.suppliers.quickCreate(
        clientId,
        { name: dto.supplierName },
        context,
      );
      return { id: supplier.id, name: supplier.name };
    }
    throw new BadRequestException(
      'One of supplierId or supplierName is required',
    );
  }
}

function toPurchaseOrderResponse(
  row: any & {
    supplier: { id: string; name: string };
  },
): PurchaseOrderResponse {
  return {
    id: row.id,
    clientId: row.clientId,
    supplierId: row.supplierId,
    supplier: row.supplier,
    budgetLineId: row.budgetLineId,
    reference: row.reference,
    label: row.label,
    amountHt: Number(row.amountHt),
    taxRate: row.taxRate == null ? null : Number(row.taxRate),
    taxAmount: row.taxAmount == null ? null : Number(row.taxAmount),
    amountTtc: row.amountTtc == null ? null : Number(row.amountTtc),
    orderDate: row.orderDate,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

