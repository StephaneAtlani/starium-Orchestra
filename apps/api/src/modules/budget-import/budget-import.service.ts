import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  BudgetEnvelopeStatus,
  BudgetEnvelopeType,
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
import { PlatformUploadSettingsService } from '../platform-upload/platform-upload-settings.service';
import { SAMPLE_ROWS_LIMIT } from './constants';
import type { UploadedFileType } from './types';
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
import { AnalyzeSheetDto } from './dto/analyze-sheet.dto';
import { BudgetLandingService } from '../budget-landing/budget-landing.service';

const ALLOWED_EXTENSIONS = /\.(csv|xlsx)$/i;

export interface AnalyzeResult {
  fileToken: string;
  sourceType: BudgetImportSourceType;
  sheetNames?: string[];
  /** Onglet Excel utilisé pour colonnes / échantillon (CSV : absent). */
  activeSheetName?: string;
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
  /** Code fichier à matérialiser si `createMissingEnvelopes` (enveloppe absente du budget). */
  pendingEnvelopeCode?: string;
  pendingEnvelopeName?: string;
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
    private readonly platformUpload: PlatformUploadSettingsService,
    private readonly landingService: BudgetLandingService,
  ) {}

  async analyze(
    clientId: string,
    userId: string,
    file: UploadedFileType,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<AnalyzeResult> {
    if (!file || (!(file as any).buffer && !file.buffer)) {
      throw new BadRequestException('File is required');
    }
    const buffer = Buffer.isBuffer((file as any).buffer) ? (file as any).buffer : Buffer.from((file as any).buffer ?? []);
    const maxBytes = this.platformUpload.getEffectiveMaxBytes();
    if (buffer.length > maxBytes) {
      const mb = (maxBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
      throw new BadRequestException(
        `La taille du fichier ne doit pas dépasser ${mb} Mo (réglage plateforme).`,
      );
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
    const analyzed = await this.parser.analyze(buffer, sourceType, {
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
      activeSheetName: analyzed.activeSheetName,
      columns: analyzed.columns,
      sampleRows: analyzed.sampleRows,
      rowCount: analyzed.rowCount,
    };
  }

  /**
   * Ré-analyse le fichier déjà stocké pour un autre onglet Excel (même fileToken).
   */
  async analyzeSheet(
    clientId: string,
    userId: string,
    dto: AnalyzeSheetDto,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<AnalyzeResult> {
    const { buffer, meta: fileMeta } = this.fileStore.get(dto.fileToken, clientId, userId);
    if (fileMeta.sourceType !== 'XLSX') {
      throw new BadRequestException('La sélection d’onglet ne s’applique qu’aux fichiers Excel (.xlsx)');
    }
    const names = await this.parser.listXlsxSheetNames(buffer);
    if (!names.includes(dto.sheetName)) {
      throw new BadRequestException(`Onglet inconnu : « ${dto.sheetName} »`);
    }
    const analyzed = await this.parser.analyze(buffer, fileMeta.sourceType, {
      sampleLimit: SAMPLE_ROWS_LIMIT,
      sheetName: dto.sheetName,
    });
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'budget_import.analyzed',
      resourceType: 'budget_import',
      newValue: {
        fileToken: dto.fileToken,
        fileName: fileMeta.fileName,
        sheetName: dto.sheetName,
        rowCount: analyzed.rowCount,
        reanalyzeSheet: true,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return {
      fileToken: dto.fileToken,
      sourceType: fileMeta.sourceType,
      sheetNames: analyzed.sheetNames,
      activeSheetName: dto.sheetName,
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
    const parseResult = await this.parser.parse(buffer, fileMeta.sourceType, {
      headerRowIndex: 1,
      maxRows: 20000,
      sheetName: dto.sheetName,
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
      data: {
        ...(r.normalizedRow.values as Record<string, unknown>),
        ...(r.pendingEnvelopeCode
          ? {
              _willCreateEnvelopeCode: r.pendingEnvelopeCode,
              _willCreateEnvelopeName: r.pendingEnvelopeName ?? null,
            }
          : {}),
      },
      errorMessage:
        r.reason === 'MISSING_ENVELOPE' ||
        r.reason === 'INVALID_AMOUNT' ||
        r.reason === 'INVALID_DATE' ||
        r.reason === 'MISSING_REQUIRED_FIELD'
          ? r.reason
          : undefined,
    }));
    const pendingEnvelopeCodes = [
      ...new Set(
        resolved
          .map((r) => r.pendingEnvelopeCode)
          .filter((c): c is string => !!c),
      ),
    ].sort((a, b) => a.localeCompare(b, 'fr'));
    const warnings =
      pendingEnvelopeCodes.length > 0
        ? [
            `${pendingEnvelopeCodes.length} enveloppe(s) seront créées à l’import : ${pendingEnvelopeCodes.join(', ')}.`,
          ]
        : [];
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'budget_import.previewed',
      resourceType: 'budget_import',
      resourceId: dto.budgetId,
      newValue: { budgetId: dto.budgetId, stats, pendingEnvelopeCodes },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return {
      stats,
      previewRows,
      warnings,
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
    const parseResult = await this.parser.parse(buffer, fileMeta.sourceType, {
      headerRowIndex: 1,
      maxRows: 20000,
      sheetName: dto.sheetName,
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
        const touchedLineIds: string[] = [];
        for (const r of resolved) {
          if (r.action === 'CREATE') {
            let envelopeId = r.envelopeId ?? options.defaultEnvelopeId ?? null;
            if (
              !envelopeId &&
              r.pendingEnvelopeCode &&
              options.createMissingEnvelopes !== false
            ) {
              envelopeId = await this.ensureEnvelopeInTx(
                tx,
                clientId,
                dto.budgetId,
                envelopeMaps,
                r.pendingEnvelopeCode,
                r.pendingEnvelopeName ?? `Enveloppe ${r.pendingEnvelopeCode}`,
              );
            }
            if (!envelopeId) {
              errorRows++;
              continue;
            }
            const name = String(r.normalizedRow.values['name'] ?? r.normalizedRow.values['label'] ?? 'Imported');
            const am = this.extractAmountsForBudgetLine(r.normalizedRow.values);
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
                initialAmount: new Prisma.Decimal(am.revised),
                forecastAmount: new Prisma.Decimal(0),
                committedAmount: new Prisma.Decimal(am.committed),
                consumedAmount: new Prisma.Decimal(am.consumed),
                remainingAmount: new Prisma.Decimal(am.remaining),
              },
            });
            touchedLineIds.push(line.id);
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
            const am = this.extractAmountsForBudgetLine(r.normalizedRow.values);
            const currency = String(r.normalizedRow.values['currency'] ?? options.defaultCurrency ?? 'EUR').toUpperCase();
            await tx.budgetLine.updateMany({
              where: { id: r.existingTargetEntityId, clientId },
              data: {
                initialAmount: new Prisma.Decimal(am.revised),
                committedAmount: new Prisma.Decimal(am.committed),
                consumedAmount: new Prisma.Decimal(am.consumed),
                remainingAmount: new Prisma.Decimal(am.remaining),
                currency,
              },
            });
            touchedLineIds.push(r.existingTargetEntityId);
            updatedRows++;
          } else if (r.action === 'SKIP') {
            skippedRows++;
          } else {
            errorRows++;
          }
        }
        for (const lineId of touchedLineIds) {
          await this.landingService.recalculateAndPersist(
            clientId,
            lineId,
            undefined,
            tx,
          );
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
      if (dto.mappingId) {
        await this.prisma.budgetImportMapping.updateMany({
          where: { id: dto.mappingId, clientId },
          data: { lastUsedAt: new Date() },
        });
      }
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

  /**
   * Montants ligne budgétaire depuis les champs logiques (montant, initial, engagé, consommé).
   * `revised` = amount ou initialAmount ; reste = max(0, revised - engagé - consommé).
   */
  private extractAmountsForBudgetLine(
    values: Record<string, string | number | null>,
  ): {
    initial: number;
    revised: number;
    committed: number;
    consumed: number;
    remaining: number;
  } {
    const num = (k: string): number => {
      const v = values[k];
      if (v == null) return 0;
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
      return 0;
    };
    const fromInitial = num('initialAmount');
    const fromAmount = num('amount');
    const revised = fromAmount || fromInitial || 0;
    const initial = fromInitial || fromAmount || revised;
    const committed = num('committedAmount');
    const consumed = num('consumedAmount');
    const remaining = Math.max(0, revised - committed - consumed);
    return { initial, revised, committed, consumed, remaining };
  }

  private mergeOptions(
    options?: Partial<BudgetImportOptionsConfig>,
  ): BudgetImportOptionsConfig {
    return {
      trimValues: true,
      ignoreEmptyRows: true,
      defaultCurrency: 'EUR',
      importMode: 'UPSERT',
      createMissingEnvelopes: true,
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

  private envelopeCodeFromNormalized(
    values: Record<string, string | number | null>,
  ): string | null {
    const raw = values['envelopeCode'] ?? values['envelope'];
    if (raw == null || raw === '') return null;
    const code = String(raw).trim();
    return code.length > 0 ? code : null;
  }

  private envelopeNameFromNormalized(
    values: Record<string, string | number | null>,
    fallbackCode: string,
  ): string {
    const raw = values['envelopeName'];
    if (raw != null && String(raw).trim()) return String(raw).trim();
    return `Enveloppe ${fallbackCode}`;
  }

  private resolveEnvelopeId(
    normalized: { values: Record<string, string | number | null> },
    options: BudgetImportOptionsConfig,
    maps: EnvelopeMaps,
  ): string | null {
    const envelopeCode = this.envelopeCodeFromNormalized(normalized.values);
    const envelopeId = normalized.values['envelopeId'];
    if (envelopeId && maps.byId.has(String(envelopeId))) {
      return String(envelopeId);
    }
    if (envelopeCode) {
      const id = maps.byCode.get(envelopeCode.toUpperCase());
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
    const createMissingEnvelopes = options.createMissingEnvelopes !== false;
    const seenExternalId = new Set<string>();
    const seenCompositeHash = new Set<string>();
    const result: ResolvedAction[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalized = this.matching.normalizeRow(row, mapping, options);
      let envelopeId = this.resolveEnvelopeId(normalized, options, envelopeMaps);
      let pendingEnvelopeCode: string | undefined;
      let pendingEnvelopeName: string | undefined;
      if (!envelopeId) {
        const code = this.envelopeCodeFromNormalized(normalized.values);
        if (createMissingEnvelopes && code) {
          pendingEnvelopeCode = code;
          pendingEnvelopeName = this.envelopeNameFromNormalized(
            normalized.values,
            code,
          );
        } else {
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
      const vAmt = normalized.values['amount'];
      const vInit = normalized.values['initialAmount'];
      const vComm = normalized.values['committedAmount'];
      const vCons = normalized.values['consumedAmount'];
      const hasAnyAmount =
        (vAmt != null && typeof vAmt === 'number') ||
        (vInit != null && typeof vInit === 'number') ||
        (vComm != null && typeof vComm === 'number') ||
        (vCons != null && typeof vCons === 'number');
      if (!hasAnyAmount) {
        result.push({
          action: 'ERROR',
          rowIndex: i + 1,
          reason: 'MISSING_REQUIRED_FIELD',
          normalizedRow: normalized,
          rawRow: row,
        });
        continue;
      }
      const checkNeg = (x: unknown) =>
        typeof x === 'number' && (Number.isNaN(x) || x < 0);
      if (
        checkNeg(vAmt) ||
        checkNeg(vInit) ||
        checkNeg(vComm) ||
        checkNeg(vCons)
      ) {
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
      const envelopeMeta = {
        envelopeId: envelopeId ?? undefined,
        pendingEnvelopeCode,
        pendingEnvelopeName,
      };
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
            ...envelopeMeta,
            rawRow: row,
          });
        } else {
          result.push({
            action: 'UPDATE',
            rowIndex: i + 1,
            reason: pendingEnvelopeCode ? 'WILL_CREATE_ENVELOPE' : matchReason,
            normalizedRow: normalized,
            existingTargetEntityId: existing.targetEntityId,
            ...envelopeMeta,
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
            ...envelopeMeta,
            rawRow: row,
          });
        } else {
          result.push({
            action: 'CREATE',
            rowIndex: i + 1,
            reason: pendingEnvelopeCode ? 'WILL_CREATE_ENVELOPE' : 'NO_MATCH_CREATE',
            normalizedRow: normalized,
            ...envelopeMeta,
            rawRow: row,
          });
        }
      }
    }
    return result;
  }

  private async ensureEnvelopeInTx(
    tx: Prisma.TransactionClient,
    clientId: string,
    budgetId: string,
    maps: EnvelopeMaps,
    code: string,
    name: string,
  ): Promise<string> {
    const key = code.toUpperCase();
    const existingId = maps.byCode.get(key);
    if (existingId) return existingId;

    const existing = await tx.budgetEnvelope.findUnique({
      where: {
        clientId_budgetId_code: { clientId, budgetId, code },
      },
    });
    if (existing) {
      maps.byCode.set(key, existing.id);
      maps.byId.set(existing.id, { id: existing.id, code: existing.code });
      return existing.id;
    }

    const created = await tx.budgetEnvelope.create({
      data: {
        clientId,
        budgetId,
        name: name.trim() || `Enveloppe ${code}`,
        code,
        type: BudgetEnvelopeType.RUN,
        status: BudgetEnvelopeStatus.ACTIVE,
        description: 'Créée automatiquement lors de l’import',
        sortOrder: 0,
      },
    });
    maps.byCode.set(key, created.id);
    maps.byId.set(created.id, { id: created.id, code: created.code });
    return created.id;
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
