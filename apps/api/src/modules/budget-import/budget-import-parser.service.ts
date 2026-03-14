import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import {
  BudgetImportSourceType,
} from '@prisma/client';
import { MAX_ROWS } from './constants';

export interface ParsedSheetRow {
  [column: string]: string;
}

export interface ParseResult {
  columns: string[];
  rows: ParsedSheetRow[];
  sheetNames?: string[];
}

export interface ParseOptions {
  sheetName?: string;
  headerRowIndex?: number;
  maxRows?: number;
  csvDelimiter?: ',' | ';';
}

@Injectable()
export class BudgetImportParserService {
  parse(
    buffer: Buffer,
    sourceType: BudgetImportSourceType,
    options: ParseOptions = {},
  ): ParseResult {
    const maxRows = options.maxRows ?? MAX_ROWS;
    const headerRowIndex = options.headerRowIndex ?? 0;

    if (sourceType === 'XLSX') {
      return this.parseXlsx(buffer, { sheetName: options.sheetName, headerRowIndex, maxRows });
    }
    return this.parseCsv(buffer, {
      delimiter: options.csvDelimiter,
      headerRowIndex,
      maxRows,
    });
  }

  private parseXlsx(
    buffer: Buffer,
    options: { sheetName?: string; headerRowIndex: number; maxRows: number },
  ): ParseResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    const sheetName = options.sheetName ?? sheetNames[0];
    if (!sheetName || !workbook.Sheets[sheetName]) {
      return { columns: [], rows: [], sheetNames };
    }
    const sheet = workbook.Sheets[sheetName];
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown[][];

    if (rawRows.length === 0) {
      return { columns: [], rows: [], sheetNames };
    }
    const headerRow = rawRows[options.headerRowIndex] as string[];
    const columns = headerRow.map((c) => String(c ?? '').trim() || `Column_${headerRow.indexOf(c)}`);
    const dataStart = options.headerRowIndex + 1;
    const dataRows = rawRows.slice(dataStart, dataStart + options.maxRows) as string[][];
    const rows: ParsedSheetRow[] = dataRows.map((row) => {
      const obj: ParsedSheetRow = {};
      columns.forEach((col, i) => {
        obj[col] = row[i] != null ? String(row[i]).trim() : '';
      });
      return obj;
    });
    return { columns, rows, sheetNames };
  }

  private parseCsv(
    buffer: Buffer,
    options: {
      delimiter?: ',' | ';';
      headerRowIndex: number;
      maxRows: number;
    },
  ): ParseResult {
    const str = buffer.toString('utf-8');
    const lines = str.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) {
      return { columns: [], rows: [] };
    }
    const delimiter = options.delimiter ?? this.detectDelimiter(lines[0]);
    const parseOpts: { delimiter: string; from_line?: number; to_line?: number; columns: true | string[] } = {
      delimiter,
      columns: true,
    };
    const allRecords = parse(str, {
      ...parseOpts,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as ParsedSheetRow[];
    const limited = allRecords.slice(0, options.maxRows);
    const columns = limited.length > 0 ? Object.keys(limited[0]) : [];
    return { columns, rows: limited };
  }

  private detectDelimiter(firstLine: string): ',' | ';' {
    const semicolons = (firstLine.match(/;/g) ?? []).length;
    const commas = (firstLine.match(/,/g) ?? []).length;
    return semicolons >= commas ? ';' : ',';
  }

  /** Used by analyze: get columns and sample rows without full parse. */
  analyze(
    buffer: Buffer,
    sourceType: BudgetImportSourceType,
    options: { sheetName?: string; headerRowIndex?: number; sampleLimit?: number } = {},
  ): { columns: string[]; sampleRows: ParsedSheetRow[]; rowCount: number; sheetNames?: string[] } {
    const sampleLimit = options.sampleLimit ?? 20;
    const result = this.parse(buffer, sourceType, {
      ...options,
      maxRows: sampleLimit,
    });
    const fullCount =
      sourceType === 'XLSX'
        ? this.countXlsxRows(buffer, options.sheetName, options.headerRowIndex ?? 0)
        : this.countCsvRows(buffer);
    return {
      columns: result.columns,
      sampleRows: result.rows,
      rowCount: Math.min(fullCount, MAX_ROWS),
      sheetNames: result.sheetNames,
    };
  }

  private countXlsxRows(buffer: Buffer, sheetName?: string, headerRowIndex = 0): number {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const name = sheetName ?? workbook.SheetNames[0];
    const sheet = name ? workbook.Sheets[name] : null;
    if (!sheet) return 0;
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    const dataRows = rawRows.length - 1 - headerRowIndex;
    return Math.max(0, dataRows);
  }

  private countCsvRows(buffer: Buffer): number {
    const str = buffer.toString('utf-8');
    const lines = str.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return Math.max(0, lines.length - 1);
  }
}
