import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaxDisplayMode, TaxInputMode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { UpdateClientTaxSettingsDto } from './dto/update-client-tax-settings.dto';

export type ActiveClientTaxSettings = {
  taxDisplayMode: TaxDisplayMode;
  taxInputMode: TaxInputMode;
  defaultTaxRate: Prisma.Decimal | null;
};

@Injectable()
export class ClientTaxSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getActiveTaxSettings(
    clientId: string,
  ): Promise<ActiveClientTaxSettings> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        taxDisplayMode: true,
        taxInputMode: true,
        defaultTaxRate: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return {
      taxDisplayMode: client.taxDisplayMode,
      taxInputMode: client.taxInputMode,
      defaultTaxRate: client.defaultTaxRate,
    };
  }

  async updateActiveTaxSettings(
    clientId: string,
    dto: UpdateClientTaxSettingsDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<ActiveClientTaxSettings> {
    const before = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        taxDisplayMode: true,
        taxInputMode: true,
        defaultTaxRate: true,
      },
    });

    if (!before) {
      throw new NotFoundException('Client not found');
    }

    const data: {
      taxDisplayMode?: TaxDisplayMode;
      taxInputMode?: TaxInputMode;
      defaultTaxRate?: Prisma.Decimal | null;
    } = {};

    if (dto.taxDisplayMode !== undefined) data.taxDisplayMode = dto.taxDisplayMode;
    if (dto.taxInputMode !== undefined) data.taxInputMode = dto.taxInputMode;
    if (dto.defaultTaxRate !== undefined) {
      data.defaultTaxRate = new Prisma.Decimal(dto.defaultTaxRate);
    }

    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data,
      select: {
        taxDisplayMode: true,
        taxInputMode: true,
        defaultTaxRate: true,
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'client.tax-settings.updated',
      resourceType: 'client',
      resourceId: clientId,
      oldValue: {
        taxDisplayMode: before.taxDisplayMode,
        taxInputMode: before.taxInputMode,
        defaultTaxRate: before.defaultTaxRate
          ? Number(before.defaultTaxRate)
          : null,
      },
      newValue: {
        taxDisplayMode: updated.taxDisplayMode,
        taxInputMode: updated.taxInputMode,
        defaultTaxRate: updated.defaultTaxRate
          ? Number(updated.defaultTaxRate)
          : null,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return {
      taxDisplayMode: updated.taxDisplayMode,
      taxInputMode: updated.taxInputMode,
      defaultTaxRate: updated.defaultTaxRate,
    };
  }
}

