import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { BudgetImportTargetEntityType } from '@prisma/client';
import type { MappingConfig, BudgetImportOptionsConfig } from './types/mapping.types';
import type { ParsedSheetRow } from './budget-import-parser.service';

export interface RowLinkLookup {
  targetEntityId: string;
  targetEntityType: BudgetImportTargetEntityType;
}

/** Maps: externalId -> RowLinkLookup, compositeHash -> RowLinkLookup. */
export interface RowLinkMaps {
  byExternalId: Map<string, RowLinkLookup>;
  byCompositeHash: Map<string, RowLinkLookup>;
}

export interface NormalizedRow {
  values: Record<string, string | number | null>;
  externalId: string | null;
  compositeHash: string | null;
}

const COMPOSITE_SEP = '|';

@Injectable()
export class BudgetImportMatchingService {
  /**
   * Normalize a raw value: trim, optional decimal/date parsing.
   */
  normalizeValue(
    raw: string,
    options: BudgetImportOptionsConfig & { logicalKey?: string },
  ): string {
    let s = raw;
    if (options.trimValues !== false) {
      s = s.trim().replace(/\s+/g, ' ');
    }
    return s;
  }

  /**
   * Parse number with optional decimal separator.
   */
  parseDecimal(raw: string, decimalSeparator: ',' | '.' = '.'): number | null {
    const s = raw.trim().replace(/\s/g, '');
    if (s === '') return null;
    const normalized = decimalSeparator === ',' ? s.replace(',', '.') : s;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Parse date: support YYYY-MM-DD, DD/MM/YYYY (if dateFormat set).
   */
  parseDate(raw: string, dateFormat?: string): string | null {
    const s = raw.trim();
    if (s === '') return null;
    if (dateFormat === 'YYYY-MM-DD' || !dateFormat) {
      const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
    if (dateFormat === 'DD/MM/YYYY') {
      const d = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (d) return `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`;
    }
    const asDate = new Date(s);
    return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString().slice(0, 10);
  }

  /**
   * Get logical field value from row using mapping (column name -> value).
   */
  getLogicalValue(
    row: ParsedSheetRow,
    logicalFieldName: string,
    mappingConfig: MappingConfig,
  ): string {
    const columnName = mappingConfig.fields[logicalFieldName];
    if (!columnName) return '';
    const raw = row[columnName] ?? '';
    return String(raw).trim();
  }

  /**
   * Build normalized row and compute externalId / compositeHash.
   */
  normalizeRow(
    row: ParsedSheetRow,
    mappingConfig: MappingConfig,
    options: BudgetImportOptionsConfig,
  ): NormalizedRow {
    const values: Record<string, string | number | null> = {};
    const fields = mappingConfig.fields || {};

    for (const [logicalKey, columnName] of Object.entries(fields)) {
      const raw = row[columnName] ?? '';
      const normalizedStr = this.normalizeValue(raw, options);
      if (
        logicalKey === 'amount' ||
        logicalKey === 'initialAmount' ||
        logicalKey === 'committedAmount' ||
        logicalKey === 'consumedAmount'
      ) {
        const n = this.parseDecimal(normalizedStr, options.decimalSeparator);
        values[logicalKey] = n;
      } else if (
        logicalKey === 'transactionDate' ||
        logicalKey === 'date' ||
        logicalKey === 'effectiveDate'
      ) {
        const d = this.parseDate(normalizedStr, options.dateFormat);
         values[logicalKey] = (d ?? normalizedStr) || null;
      } else if (logicalKey === 'currency') {
        values[logicalKey] = (normalizedStr || options.defaultCurrency || '').toUpperCase() || null;
      } else {
        values[logicalKey] = normalizedStr || null;
      }
    }

    let externalId: string | null = null;
    const externalIdCol = fields['externalId'] ?? fields['sourceLineId'] ?? fields['erpId'];
    if (externalIdCol && row[externalIdCol] != null) {
      const v = this.normalizeValue(String(row[externalIdCol]), options);
      if (v) externalId = v;
    }

    let compositeHash: string | null = null;
    const matching = mappingConfig.matching;
    if (matching?.strategy === 'COMPOSITE' && matching.keys && matching.keys.length > 0) {
      const parts = matching.keys
        .map((k) => {
          const v = values[k] ?? '';
          return v != null ? String(v) : '';
        })
        .join(COMPOSITE_SEP);
      compositeHash = this.hashComposite(parts);
    }

    return { values, externalId, compositeHash };
  }

  hashComposite(concatenated: string): string {
    return createHash('sha256').update(concatenated, 'utf-8').digest('hex');
  }

  /**
   * Find existing link by externalId or compositeHash. Returns at most one match.
   */
  findExistingLink(
    externalId: string | null,
    compositeHash: string | null,
    maps: RowLinkMaps,
  ): RowLinkLookup | null {
    if (externalId) {
      const found = maps.byExternalId.get(externalId);
      if (found) return found;
    }
    if (compositeHash) {
      const found = maps.byCompositeHash.get(compositeHash);
      if (found) return found;
    }
    return null;
  }

  /**
   * Build RowLinkMaps from list of RowLinks (e.g. from Prisma).
   */
  buildRowLinkMaps(links: Array<{ externalId: string | null; compositeHash: string | null; targetEntityId: string }>): RowLinkMaps {
    const byExternalId = new Map<string, RowLinkLookup>();
    const byCompositeHash = new Map<string, RowLinkLookup>();
    for (const link of links) {
      const lookup: RowLinkLookup = {
        targetEntityId: link.targetEntityId,
        targetEntityType: 'BUDGET_LINE',
      };
      if (link.externalId) byExternalId.set(link.externalId, lookup);
      if (link.compositeHash) byCompositeHash.set(link.compositeHash, lookup);
    }
    return { byExternalId, byCompositeHash };
  }
}
