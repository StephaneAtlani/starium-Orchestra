import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  BudgetImportJobStatus,
  BudgetImportMode,
  BudgetImportSourceType,
  BudgetImportTargetEntityType,
  BudgetLineStatus,
  BudgetStatus,
  ExpenseType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BudgetImportFileStoreService } from './budget-import-file-store.service';
import { BudgetImportParserService, ParsedSheetRow } from './budget-import-parser.service';
import { BudgetImportMatchingService, RowLinkMaps } from './budget-import-matching.service';
import {
  MAX_FILE_SIZE_BYTES,
  SAMPLE_ROWS_LIMIT,
} from './constants';
import type {
  BudgetImportOptionsConfig,
  BudgetImportPreviewStatus,
  BudgetImportJobSummary,
  PreviewReason,
  PreviewRowResult,
} from './types/mapping.types';
import type { MappingConfig } from './types/mapping.types';
import { ExecuteImportDto } from './dto/execute-import.dto';
import { PreviewImportDto } from './dto/preview-import.dto';

const ALLOWED_EXTENSIONS = /\.(csv|xlsx)$/i;

export interface AnalyzeResult {
  fileToken: string;
  sourceType: BudgetImportSourceType;
  sheetNames?: string[];
  columns: string[];
  sampleRows: Record<string, string>[];
  rowCount: number;
}

export interface PreviewResult {
  stats: {
    totalRows: number;
    createRows: number;
    updateRows: number;
    skipRows: number;
    errorRows: number;
  };
  previewRows: PreviewRowResult[];
  warnings: string[];
  errors: string[];
}

export interface ExecuteResult {
  jobId: string;
  status: BudgetImportJobStatus;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
}

interface EnvelopeMaps {
  byId: Map<string, { id: string; code: string }>;
  byCode: Map<string, string>;
}

interface ResolvedAction {
  action: BudgetImportPreviewStatus;
  rowIndex: number;
  reason?: PreviewReason;
  normalizedRow: { values: Record<string, string | number | null>; externalId: string | null; compositeHash: string | null };
  envelopeId?: string | null;
  existingTargetEntityId?: string | null;
  rawRow: ParsedSheetRow;
}

@Injectable()
export class BudgetImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly fileStore: BudgetImportFileStoreService,
    private readonly parser: BudgetImportParserService,
    private readonly matching: BudgetImportMatchingService,
  ) {}

  async analyze(
    clientId: string,
    userId: string,
    file: Express.Multer.File,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<AnalyzeResult> {
    if (!file || (!(file as any).buffer && !file.buffer)) {
      throw new BadRequestException('File is required');
    }
    const buffer = Buffer.isBuffer((file as any).buffer) ? (file as any).buffer : Buffer.from((file as any).buffer ?? []);
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File size must not exceed ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`);
    }
    const origName = file.originalname ?? 'upload';
    if (!ALLOWED_EXTENSIONS.test(origName)) {
      throw new BadRequestException('Allowed extensions: .csv, .xlsx');
    }
    const sourceType: BudgetImportSourceType = origName.toLowerCase().endsWith('.xlsx') ? 'XLSX' : 'CSV';
    const fileToken = this.fileStore.generateToken();
    this.fileStore.save(fileToken, buffer, {
      clientId,
      uploadedByUserId: userId,
      fileName: origName,
      sourceType,
    });
    const analyzed = this.parser.analyze(buffer, sourceType, {
      sampleLimit: SAMPLE_ROWS_LIMIT,
    });
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'budget_import.analyzed',
      resourceType: 'budget_import',
      newValue: { fileToken, fileName: origName, rowCount: analyzed.rowCount },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return {
      fileToken,
      sourceType,
      sheetNames: analyzed.sheetNames,
      columns: analyzed.columns,
      sampleRows: analyzed.sampleRows,
      rowCount: analyzed.rowCount,
    };
  }

  async preview(
    clientId: string,
    userId: string,
    dto: PreviewImportDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<PreviewResult> {
    const { buffer, meta: fileMeta } = this.fileStore.get(dto.fileToken, clientId, userId);
    const options = this.mergeOptions(dto.options);
    await this.validateBudget(clientId, dto.budgetId);
    const envelopeMaps = await this.loadEnvelopeMaps(clientId, dto.budgetId);
    const rowLinkMaps = await this.loadRowLinkMaps(clientId, dto.budgetId);
    const parseResult = this.parser.parse(buffer, fileMeta.sourceType, {
      headerRowIndex: 1,
      maxRows: 20000,
    });
    const resolved = this.resolveActions(
      parseResult.rows,
      dto.mapping,
      options,
      envelopeMaps,
      rowLinkMaps,
    );
    const stats = {
      totalRows: resolved.length,
      createRows: resolved.filter((r) => r.action === 'CREATE').length,
      updateRows: resolved.filter((r) => r.action === 'UPDATE').length,
      skipRows: resolved.filter((r) => r.action === 'SKIP').length,
      errorRows: resolved.filter((r) => r.action === 'ERROR').length,
    };
    const previewRows: PreviewRowResult[] = resolved.map((r) => ({
      rowIndex: r.rowIndex,
      status: r.action,
      reason: r.reason,
      data: r.normalizedRow.values as Record<string, unknown>,
      errorMessage: r.reason === 'MISSING_ENVELOPE' || r.reason === 'INVALID_AMOUNT' || r.reason === 'INVALID_DATE' || r.reason === 'MISSING_REQUIRED_FIELD' ? r.reason : undefined,
    }));
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'budget_import.previewed',
      resourceType: 'budget_import',
      resourceId: dto.budgetId,
      newValue: { budgetId: dto.budgetId, stats },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return {
      stats,
      previewRows,
      warnings: [],
      errors: [],
    };
  }

  async execute(
    clientId: string,
    userId: string,
    dto: ExecuteImportDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<ExecuteResult> {
    const { buffer, meta: fileMeta } = this.fileStore.get(dto.fileToken, clientId, userId);
    const options = this.mergeOptions(dto.options);
    const importMode = options.importMode ?? 'UPSERT';
    await this.validateBudget(clientId, dto.budgetId);
    const defaultGlaId = await this.resolveDefaultGeneralLedgerAccountId(
      clientId,
      options.defaultGeneralLedgerAccountId,
    );
    const envelopeMaps = await this.loadEnvelopeMaps(clientId, dto.budgetId);
    const rowLinkMaps = await this.loadRowLinkMaps(clientId, dto.budgetId);
    const parseResult = this.parser.parse(buffer, fileMeta.sourceType, {
      headerRowIndex: 1,
      maxRows: 20000,
    });
    const resolved = this.resolveActions(
      parseResult.rows,
      dto.mapping,
      options,
      envelopeMaps,
      rowLinkMaps,
    );
    const errorsByType: Record<string, number> = {};
    for (const r of resolved) {
      if (r.action === 'ERROR' && r.reason) {
        errorsByType[r.reason] = (errorsByType[r.reason] ?? 0) + 1;
      }
    }
    const summary: BudgetImportJobSummary = {
      warningsCount: 0,
      errorsByType,
    };
    let createdRows = 0;
    let updatedRows = 0;
    let skippedRows = 0;
    let errorRows = 0;
    let jobId: string;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const job = await tx.budgetImportJob.create({
          data: {
            clientId,
            budgetId: dto.budgetId,
            mappingId: dto.mappingId ?? null,
            fileName: fileMeta.fileName,
            sourceType: fileMeta.sourceType,
            status: BudgetImportJobStatus.RUNNING,
            importMode: importMode as BudgetImportMode,
            totalRows: resolved.length,
            createdById: userId,
          },
        });
        jobId = job.id;
        for (const r of resolved) {
          if (r.action === 'CREATE') {
            const envelopeId = r.envelopeId ?? options.defaultEnvelopeId;
            if (!envelopeId) {
              errorRows++;
              continue;
            }
            const name = String(r.normalizedRow.values['name'] ?? r.normalizedRow.values['label'] ?? 'Imported');
            const amount = Number(r.normalizedRow.values['amount'] ?? r.normalizedRow.values['initialAmount'] ?? 0);
            const currency = String(r.normalizedRow.values['currency'] ?? options.defaultCurrency ?? 'EUR').toUpperCase();
            const code = await this.resolveUniqueBudgetLineCodeInTx(tx, clientId, dto.budgetId);
            const line = await tx.budgetLine.create({
              data: {
                clientId,
                budgetId: dto.budgetId,
                envelopeId,
                name,
                code,
                description: null,
                expenseType: ExpenseType.OPEX,
                status: BudgetLineStatus.DRAFT,
                currency,
                generalLedgerAccountId: defaultGlaId,
                analyticalLedgerAccountId: null,
                allocationScope: 'ENTERPRISE',
                initialAmount: new Prisma.Decimal(amount),
                revisedAmount: new Prisma.Decimal(amount),
                forecastAmount: new Prisma.Decimal(0),
                committedAmount: new Prisma.Decimal(0),
                consumedAmount: new Prisma.Decimal(0),
                remainingAmount: new Prisma.Decimal(amount),
              },
            });
            const existingByKey = await this.findRowLinkByKeyInTx(tx, clientId, dto.budgetId, r.normalizedRow.externalId, r.normalizedRow.compositeHash);
            if (!existingByKey) {
              await tx.budgetImportRowLink.create({
                data: {
                  clientId,
                  budgetId: dto.budgetId,
                  importJobId: job.id,
                  targetEntityType: BudgetImportTargetEntityType.BUDGET_LINE,
                  targetEntityId: line.id,
                  externalId: r.normalizedRow.externalId,
                  compositeHash: r.normalizedRow.compositeHash,
                },
              });
            }
            createdRows++;
          } else if (r.action === 'UPDATE' && r.existingTargetEntityId) {
            const amount = Number(r.normalizedRow.values['amount'] ?? r.normalizedRow.values['initialAmount'] ?? 0);
            const currency = String(r.normalizedRow.values['currency'] ?? options.defaultCurrency ?? 'EUR').toUpperCase();
            await tx.budgetLine.updateMany({
              where: { id: r.existingTargetEntityId, clientId },
              data: {
                revisedAmount: new Prisma.Decimal(amount),
                remainingAmount: new Prisma.Decimal(amount),
                currency,
              },
            });
            updatedRows++;
          } else if (r.action === 'SKIP') {
            skippedRows++;
          } else {
            errorRows++;
          }
        }
        await tx.budgetImportJob.update({
          where: { id: job.id },
          data: {
            status: BudgetImportJobStatus.COMPLETED,
            createdRows,
            updatedRows,
            skippedRows,
            errorRows,
            summary: summary as object,
          },
        });
        return { jobId: job.id };
      });
      this.fileStore.delete(dto.fileToken);
      await this.auditLogs.create({
        clientId,
        userId,
        action: 'budget_import.executed',
        resourceType: 'budget_import_job',
        resourceId: result.jobId,
        newValue: { jobId: result.jobId, createdRows, updatedRows, skippedRows, errorRows },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        requestId: meta?.requestId,
      });
      return {
        jobId: result.jobId,
        status: BudgetImportJobStatus.COMPLETED,
        totalRows: resolved.length,
        createdRows,
        updatedRows,
        skippedRows,
        errorRows,
      };
    } catch (e) {
      if (jobId!) {
        await this.prisma.budgetImportJob.update({
          where: { id: jobId },
          data: { status: BudgetImportJobStatus.FAILED, summary: summary as object },
        });
      }
      this.fileStore.delete(dto.fileToken);
      await this.auditLogs.create({
        clientId,
        userId,
        action: 'budget_import.failed',
        resourceType: 'budget_import_job',
        resourceId: jobId!,
        newValue: { error: (e as Error).message },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        requestId: meta?.requestId,
      });
      throw e;
    }
  }

  private mergeOptions(
    options?: Partial<BudgetImportOptionsConfig>,
  ): BudgetImportOptionsConfig {
    return {
      trimValues: true,
      ignoreEmptyRows: true,
      defaultCurrency: 'EUR',
      importMode: 'UPSERT',
      ...options,
    };
  }

  private async validateBudget(clientId: string, budgetId: string): Promise<void> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    if (budget.status === BudgetStatus.LOCKED || budget.status === BudgetStatus.ARCHIVED) {
      throw new BadRequestException('Cannot import into a locked or archived budget');
    }
  }

  /** RFC-021: resolve GLA for import. Use options.defaultGeneralLedgerAccountId or client default (code 999999). */
  private async resolveDefaultGeneralLedgerAccountId(
    clientId: string,
    defaultGeneralLedgerAccountId?: string,
  ): Promise<string> {
    if (defaultGeneralLedgerAccountId) {
      const gla = await this.prisma.generalLedgerAccount.findFirst({
        where: { id: defaultGeneralLedgerAccountId, clientId },
      });
      if (!gla) {
        throw new BadRequestException(
          'defaultGeneralLedgerAccountId not found or does not belong to this client',
        );
      }
      return gla.id;
    }
    const defaultGla = await this.prisma.generalLedgerAccount.findFirst({
      where: { clientId, code: '999999' },
    });
    if (!defaultGla) {
      throw new BadRequestException(
        'No default general ledger account for this client. Create a general ledger account (e.g. code 999999) or pass defaultGeneralLedgerAccountId in options.',
      );
    }
    return defaultGla.id;
  }

  private async loadEnvelopeMaps(
    clientId: string,
    budgetId: string,
  ): Promise<EnvelopeMaps> {
    const envelopes = await this.prisma.budgetEnvelope.findMany({
      where: { clientId, budgetId },
    });
    const byId = new Map<string, { id: string; code: string }>();
    const byCode = new Map<string, string>();
    for (const e of envelopes) {
      byId.set(e.id, { id: e.id, code: e.code });
      byCode.set(e.code.toUpperCase(), e.id);
    }
    return { byId, byCode };
  }

  private async loadRowLinkMaps(
    clientId: string,
    budgetId: string,
  ): Promise<RowLinkMaps> {
    const links = await this.prisma.budgetImportRowLink.findMany({
      where: { clientId, budgetId, targetEntityType: 'BUDGET_LINE' },
    });
    return this.matching.buildRowLinkMaps(
      links.map((l) => ({
        externalId: l.externalId,
        compositeHash: l.compositeHash,
        targetEntityId: l.targetEntityId,
      })),
    );
  }

  private resolveEnvelopeId(
    normalized: { values: Record<string, string | number | null> },
    options: BudgetImportOptionsConfig,
    maps: EnvelopeMaps,
  ): string | null {
    const envelopeCode = normalized.values['envelopeCode'] ?? normalized.values['envelope'];
    const envelopeId = normalized.values['envelopeId'];
    if (envelopeId && maps.byId.has(String(envelopeId))) {
      return String(envelopeId);
    }
    if (envelopeCode != null && envelopeCode !== '') {
      const id = maps.byCode.get(String(envelopeCode).toUpperCase());
      if (id) return id;
    }
    return options.defaultEnvelopeId ?? null;
  }

  private resolveActions(
    rows: ParsedSheetRow[],
    mapping: MappingConfig,
    options: BudgetImportOptionsConfig,
    envelopeMaps: EnvelopeMaps,
    rowLinkMaps: RowLinkMaps,
  ): ResolvedAction[] {
    const importMode = (options.importMode ?? 'UPSERT') as BudgetImportMode;
    const seenExternalId = new Set<string>();
    const seenCompositeHash = new Set<string>();
    const result: ResolvedAction[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalized = this.matching.normalizeRow(row, mapping, options);
      const envelopeId = this.resolveEnvelopeId(normalized, options, envelopeMaps);
      if (!envelopeId) {
        if (!options.defaultEnvelopeId) {
          result.push({
            action: 'ERROR',
            rowIndex: i + 1,
            reason: 'MISSING_ENVELOPE',
            normalizedRow: normalized,
            rawRow: row,
          });
          continue;
        }
      }
      const amount = normalized.values['amount'] ?? normalized.values['initialAmount'];
      if (amount != null && (typeof amount === 'number' && (Number.isNaN(amount) || amount < 0))) {
        result.push({
          action: 'ERROR',
          rowIndex: i + 1,
          reason: 'INVALID_AMOUNT',
          normalizedRow: normalized,
          rawRow: row,
        });
        continue;
      }
      const keyExternal = normalized.externalId ?? '';
      const keyComposite = normalized.compositeHash ?? '';
      const duplicateInFile =
        (keyExternal && seenExternalId.has(keyExternal)) ||
        (keyComposite && seenCompositeHash.has(keyComposite));
      if (duplicateInFile) {
        result.push({
          action: 'ERROR',
          rowIndex: i + 1,
          reason: 'DUPLICATE_SOURCE_KEY',
          normalizedRow: normalized,
          rawRow: row,
        });
        continue;
      }
      if (keyExternal) seenExternalId.add(keyExternal);
      if (keyComposite) seenCompositeHash.add(keyComposite);
      const existing = this.matching.findExistingLink(
        normalized.externalId,
        normalized.compositeHash,
        rowLinkMaps,
      );
      if (existing) {
        const matchReason: PreviewReason = normalized.externalId
          ? 'MATCHED_BY_EXTERNAL_ID'
          : 'MATCHED_BY_COMPOSITE_KEY';
        if (importMode === 'CREATE_ONLY') {
          result.push({
            action: 'SKIP',
            rowIndex: i + 1,
            reason: matchReason,
            normalizedRow: normalized,
            existingTargetEntityId: existing.targetEntityId,
            envelopeId: envelopeId ?? undefined,
            rawRow: row,
          });
        } else {
          result.push({
            action: 'UPDATE',
            rowIndex: i + 1,
            reason: matchReason,
            normalizedRow: normalized,
            existingTargetEntityId: existing.targetEntityId,
            envelopeId: envelopeId ?? undefined,
            rawRow: row,
          });
        }
      } else {
        if (importMode === 'UPDATE_ONLY') {
          result.push({
            action: 'SKIP',
            rowIndex: i + 1,
            reason: 'NO_MATCH_UPDATE_ONLY',
            normalizedRow: normalized,
            envelopeId: envelopeId ?? undefined,
            rawRow: row,
          });
        } else {
          result.push({
            action: 'CREATE',
            rowIndex: i + 1,
            reason: 'NO_MATCH_CREATE',
            normalizedRow: normalized,
            envelopeId: envelopeId ?? undefined,
            rawRow: row,
          });
        }
      }
    }
    return result;
  }

  private async resolveUniqueBudgetLineCodeInTx(
    tx: Prisma.TransactionClient,
    clientId: string,
    budgetId: string,
  ): Promise<string> {
    let code = `BL-${randomBytes(6).toString('hex')}`;
    let exists = await tx.budgetLine.findUnique({
      where: { clientId_budgetId_code: { clientId, budgetId, code } },
    });
    let attempts = 0;
    while (exists && attempts < 10) {
      code = `BL-${randomBytes(6).toString('hex')}`;
      exists = await tx.budgetLine.findUnique({
        where: { clientId_budgetId_code: { clientId, budgetId, code } },
      });
      attempts++;
    }
    return code;
  }

  private async findRowLinkByKeyInTx(
    tx: Prisma.TransactionClient,
    clientId: string,
    budgetId: string,
    externalId: string | null,
    compositeHash: string | null,
  ): Promise<{ id: string } | null> {
    if (externalId) {
      const found = await tx.budgetImportRowLink.findFirst({
        where: { clientId, budgetId, externalId },
      });
      if (found) return { id: found.id };
    }
    if (compositeHash) {
      const found = await tx.budgetImportRowLink.findFirst({
        where: { clientId, budgetId, compositeHash },
      });
      if (found) return { id: found.id };
    }
    return null;
  }
}
