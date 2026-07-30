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
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices.query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

interface SupplierMini {
  id: string;
  name: string;
}

export interface InvoiceResponse {
  id: string;
  clientId: string;
  supplierId: string;
  supplier: SupplierMini;
  budgetLineId: string | null;
  purchaseOrderId: string | null;
  invoiceNumber: string;
  label: string;
  amountHt: number;
  taxRate: number | null;
  taxAmount: number | null;
  amountTtc: number | null;
  invoiceDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListInvoicesResult {
  items: InvoiceResponse[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: FinancialEventsService,
    private readonly auditLogs: AuditLogsService,
    private readonly suppliers: SuppliersService,
  ) {}

  async list(
    clientId: string,
    query: ListInvoicesQueryDto,
  ): Promise<ListInvoicesResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: any = {
      clientId,
      ...(query.includeCancelled ? {} : { status: { not: 'CANCELLED' } }),
      ...(query.supplierId && { supplierId: query.supplierId }),
      ...(query.budgetLineId && { budgetLineId: query.budgetLineId }),
      ...(query.purchaseOrderId && { purchaseOrderId: query.purchaseOrderId }),
      ...(query.status && { status: query.status }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { label: { contains: term, mode: 'insensitive' } },
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { supplier: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items: items.map(toInvoiceResponse), total, limit, offset };
  }

  async getById(clientId: string, id: string): Promise<InvoiceResponse> {
    const row = await this.prisma.invoice.findFirst({
      where: { id, clientId },
      include: { supplier: { select: { id: true, name: true } } },
    });
    if (!row) {
      throw new NotFoundException('Facture introuvable');
    }
    return toInvoiceResponse(row);
  }

  async listBySupplier(
    clientId: string,
    supplierId: string,
    query: { limit?: number; offset?: number; includeCancelled?: boolean },
  ) {
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
  ) {
    return this.list(clientId, {
      budgetLineId,
      includeCancelled: query.includeCancelled,
      limit: query.limit,
      offset: query.offset,
    });
  }

  async create(
    clientId: string,
    dto: CreateInvoiceDto,
    context?: ProcurementAuditContext,
  ): Promise<InvoiceResponse> {
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
      const po = await this.resolvePurchaseOrder(clientId, dto.purchaseOrderId);

      if (po && po.supplierId !== supplier.id) {
        throw new BadRequestException(
          'Invoice purchaseOrderId must match the same supplier',
        );
      }

      const effectiveBudgetLineId = dto.budgetLineId ?? po?.budgetLineId ?? null;
      const budgetLine = await this.resolveBudgetLine(clientId, effectiveBudgetLineId);

      const created = await tx.invoice.create({
        data: {
          clientId,
          supplierId: supplier.id,
          budgetLineId: effectiveBudgetLineId,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          invoiceNumber: dto.invoiceNumber.trim(),
          label: dto.label.trim(),
          amountHt: taxCalc.amountHt,
          taxRate: taxCalc.taxRate,
          taxAmount: taxCalc.taxAmount,
          amountTtc: taxCalc.amountTtc,
          invoiceDate: dto.invoiceDate,
          status: 'VALIDATED',
        },
        include: { supplier: { select: { id: true, name: true } } },
      });

      if (budgetLine) {
        // Facture : consommation budgétaire (pas COMMITMENT_REGISTERED) — aligné agrégats / versions figées.
        await this.events.create(
          clientId,
          {
            budgetLineId: budgetLine.id,
            sourceType: FinancialSourceType.INVOICE,
            sourceId: created.id,
            eventType: FinancialEventType.CONSUMPTION_REGISTERED,
            amountHt: created.amountHt.toFixed(2),
            ...(created.taxRate
              ? { taxRate: created.taxRate.toFixed(2) }
              : { useDefaultTaxRate: true }),
            currency: budgetLine.currency,
            eventDate: created.invoiceDate,
            label: created.label,
          },
          context,
        );

        if (po) {
          await this.unwindPurchaseOrderCommitment(tx, clientId, {
            invoice: created,
            budgetLine,
            purchaseOrder: po,
            context,
          });
        }
      }

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'invoice.created',
        resourceType: 'invoice',
        resourceId: created.id,
        newValue: {
          invoiceNumber: created.invoiceNumber,
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

    return toInvoiceResponse(result);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateInvoiceDto,
    context?: ProcurementAuditContext,
  ): Promise<InvoiceResponse> {
    const prisma = this.prisma as any;
    const existing = await prisma.invoice.findFirst({
      where: { id, clientId },
      include: { supplier: { select: { id: true, name: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update a cancelled invoice');
    }
    if (
      dto.amountHt !== undefined ||
      dto.taxRate !== undefined ||
      dto.taxAmount !== undefined ||
      dto.amountTtc !== undefined ||
      dto.budgetLineId !== undefined
    ) {
      throw new BadRequestException(
        'PATCH invoice supports metadata only (label, invoiceNumber)',
      );
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label.trim() }),
        ...(dto.invoiceNumber !== undefined && {
          invoiceNumber: dto.invoiceNumber.trim(),
        }),
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'invoice.updated',
      resourceType: 'invoice',
      resourceId: id,
      oldValue: { label: existing.label, invoiceNumber: existing.invoiceNumber },
      newValue: { label: updated.label, invoiceNumber: updated.invoiceNumber },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return toInvoiceResponse(updated);
  }

  async cancel(
    clientId: string,
    id: string,
    context?: ProcurementAuditContext,
  ): Promise<InvoiceResponse> {
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      const existing = await tx.invoice.findFirst({
        where: { id, clientId },
        include: { supplier: { select: { id: true, name: true } } },
      });
      if (!existing) {
        throw new NotFoundException('Invoice not found');
      }
      if (existing.status === 'CANCELLED') {
        return existing;
      }

      const updated = await tx.invoice.update({
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
              sourceType: FinancialSourceType.INVOICE,
              sourceId: updated.id,
              eventType: FinancialEventType.CONSUMPTION_REGISTERED,
              amountHt: updated.amountHt.neg().toFixed(2),
              ...(updated.taxRate
                ? { taxRate: updated.taxRate.toFixed(2) }
                : { useDefaultTaxRate: true }),
              currency: budgetLine.currency,
              eventDate: new Date(),
              label: `Cancellation ${updated.invoiceNumber}`,
            },
            context,
          );

          await this.restorePurchaseOrderCommitment(tx, clientId, {
            invoice: updated,
            budgetLine,
            context,
          });
        }
      }

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'invoice.cancelled',
        resourceType: 'invoice',
        resourceId: updated.id,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });

      return updated;
    });

    return toInvoiceResponse(result);
  }

  /**
   * Une commande crée un engagement (`COMMITMENT_REGISTERED`) ; la facture qui la solde crée une
   * consommation. Sans dénouement, la ligne budgétaire porterait les deux et `remainingAmount`
   * serait doublement amputé (RFC-FE-BUD-032 §5.2).
   *
   * Le dénouement est plafonné à l'engagement encore ouvert de la commande, et porté par
   * `sourceType: INVOICE / sourceId: invoice.id` pour que l'annulation de la facture soit
   * exactement réversible.
   */
  private async unwindPurchaseOrderCommitment(
    tx: any,
    clientId: string,
    params: {
      invoice: { id: string; amountHt: Prisma.Decimal; taxRate: Prisma.Decimal | null };
      budgetLine: { id: string; currency: string };
      purchaseOrder: { id: string; reference: string };
      context?: ProcurementAuditContext;
    },
  ): Promise<void> {
    const { invoice, budgetLine, purchaseOrder, context } = params;

    const commitmentAgg = await tx.financialEvent.aggregate({
      where: {
        clientId,
        budgetLineId: budgetLine.id,
        eventType: FinancialEventType.COMMITMENT_REGISTERED,
        sourceType: FinancialSourceType.PURCHASE_ORDER,
        sourceId: purchaseOrder.id,
      },
      _sum: { amountHt: true },
    });
    const openCommitment: Prisma.Decimal =
      commitmentAgg._sum.amountHt ?? new Prisma.Decimal(0);
    if (openCommitment.lessThanOrEqualTo(0)) return;

    const invoicedAgg = await tx.invoice.aggregate({
      where: {
        clientId,
        purchaseOrderId: purchaseOrder.id,
        status: { not: 'CANCELLED' },
        id: { not: invoice.id },
      },
      _sum: { amountHt: true },
    });
    const alreadyInvoiced: Prisma.Decimal =
      invoicedAgg._sum.amountHt ?? new Prisma.Decimal(0);

    const remainingCommitment = openCommitment.minus(alreadyInvoiced);
    if (remainingCommitment.lessThanOrEqualTo(0)) return;

    const unwind = remainingCommitment.lessThan(invoice.amountHt)
      ? remainingCommitment
      : invoice.amountHt;
    if (unwind.lessThanOrEqualTo(0)) return;

    await this.events.create(
      clientId,
      {
        budgetLineId: budgetLine.id,
        sourceType: FinancialSourceType.INVOICE,
        sourceId: invoice.id,
        eventType: FinancialEventType.COMMITMENT_REGISTERED,
        amountHt: unwind.neg().toFixed(2),
        ...(invoice.taxRate
          ? { taxRate: invoice.taxRate.toFixed(2) }
          : { useDefaultTaxRate: true }),
        currency: budgetLine.currency,
        eventDate: new Date(),
        label: `Dénouement engagement commande ${purchaseOrder.reference}`,
      },
      context,
    );
  }

  /** Annulation de facture : rétablit l'engagement dénoué par cette facture, à l'euro près. */
  private async restorePurchaseOrderCommitment(
    tx: any,
    clientId: string,
    params: {
      invoice: { id: string; invoiceNumber: string; taxRate: Prisma.Decimal | null };
      budgetLine: { id: string; currency: string };
      context?: ProcurementAuditContext;
    },
  ): Promise<void> {
    const { invoice, budgetLine, context } = params;

    const unwoundAgg = await tx.financialEvent.aggregate({
      where: {
        clientId,
        budgetLineId: budgetLine.id,
        eventType: FinancialEventType.COMMITMENT_REGISTERED,
        sourceType: FinancialSourceType.INVOICE,
        sourceId: invoice.id,
      },
      _sum: { amountHt: true },
    });
    const unwound: Prisma.Decimal = unwoundAgg._sum.amountHt ?? new Prisma.Decimal(0);
    if (unwound.isZero()) return;

    await this.events.create(
      clientId,
      {
        budgetLineId: budgetLine.id,
        sourceType: FinancialSourceType.INVOICE,
        sourceId: invoice.id,
        eventType: FinancialEventType.COMMITMENT_REGISTERED,
        amountHt: unwound.neg().toFixed(2),
        ...(invoice.taxRate
          ? { taxRate: invoice.taxRate.toFixed(2) }
          : { useDefaultTaxRate: true }),
        currency: budgetLine.currency,
        eventDate: new Date(),
        label: `Rétablissement engagement — annulation ${invoice.invoiceNumber}`,
      },
      context,
    );
  }

  private async resolvePurchaseOrder(clientId: string, id?: string) {
    if (!id) return null;
    const po = await (this.prisma as any).purchaseOrder.findFirst({
      where: { id, clientId },
      select: {
        id: true,
        supplierId: true,
        budgetLineId: true,
        reference: true,
      },
    });
    if (!po) {
      throw new BadRequestException('Purchase order not found in active client');
    }
    return po;
  }

  private async resolveBudgetLine(clientId: string, budgetLineId: string | null) {
    if (!budgetLineId) return null;
    const line = await (this.prisma as any).budgetLine.findFirst({
      where: { id: budgetLineId, clientId },
      select: { id: true, currency: true },
    });
    if (!line) {
      throw new BadRequestException('Budget line not found in active client');
    }
    return line;
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

function toInvoiceResponse(
  row: any & {
    supplier: { id: string; name: string };
  },
): InvoiceResponse {
  return {
    id: row.id,
    clientId: row.clientId,
    supplierId: row.supplierId,
    supplier: row.supplier,
    budgetLineId: row.budgetLineId,
    purchaseOrderId: row.purchaseOrderId,
    invoiceNumber: row.invoiceNumber,
    label: row.label,
    amountHt: Number(row.amountHt),
    taxRate: row.taxRate == null ? null : Number(row.taxRate),
    taxAmount: row.taxAmount == null ? null : Number(row.taxAmount),
    amountTtc: row.amountTtc == null ? null : Number(row.amountTtc),
    invoiceDate: row.invoiceDate,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

