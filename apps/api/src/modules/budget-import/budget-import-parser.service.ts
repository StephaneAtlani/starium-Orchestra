import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { BudgetImportSourceType } from '@prisma/client';
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
  /** Noms des onglets d’un classeur Excel (sans lecture complète des lignes). */
  async listXlsxSheetNames(buffer: Buffer): Promise<string[]> {
    const workbook = await this.loadWorkbook(buffer);
    return workbook.worksheets.map((w) => w.name);
  }

  async parse(
    buffer: Buffer,
    sourceType: BudgetImportSourceType,
    options: ParseOptions = {},
  ): Promise<ParseResult> {
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

  private formatXlsxCellValue(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object' && value !== null && 'richText' in value) {
      const rt = value as ExcelJS.CellRichTextValue;
      return rt.richText.map((t) => t.text).join('');
    }
    if (typeof value === 'object' && value !== null && 'hyperlink' in value) {
      const h = value as { text?: string };
      return String(h.text ?? '');
    }
    if (typeof value === 'object' && value !== null && 'result' in value) {
      const f = value as ExcelJS.CellFormulaValue;
      return this.formatXlsxCellValue(f.result as ExcelJS.CellValue);
    }
    return String(value);
  }

  private readSheetAsMatrix(sheet: ExcelJS.Worksheet): string[][] {
    const lastRow = sheet.rowCount;
    const lastCol = sheet.columnCount || 1;
    const rows: string[][] = [];
    for (let r = 1; r <= lastRow; r++) {
      const row = sheet.getRow(r);
      const arr: string[] = [];
      for (let c = 1; c <= lastCol; c++) {
        arr.push(this.formatXlsxCellValue(row.getCell(c).value));
      }
      rows.push(arr);
    }
    return rows;
  }

  private async loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error exceljs 4.x : signature `Buffer` incompatible avec le branding TS de `Buffer` (Node 22+).
    await workbook.xlsx.load(buffer);
    return workbook;
  }

  private async parseXlsx(
    buffer: Buffer,
    options: { sheetName?: string; headerRowIndex: number; maxRows: number },
  ): Promise<ParseResult> {
    const workbook = await this.loadWorkbook(buffer);
    const sheetNames = workbook.worksheets.map((w) => w.name);
    const sheetName = options.sheetName ?? sheetNames[0];
    const sheet = sheetName ? workbook.getWorksheet(sheetName) : undefined;
    if (!sheet) {
      return { columns: [], rows: [], sheetNames };
    }
    const rawRows = this.readSheetAsMatrix(sheet);

    if (rawRows.length === 0) {
      return { columns: [], rows: [], sheetNames };
    }
    const headerRow = rawRows[options.headerRowIndex] ?? [];
    const columns = headerRow.map((c) => String(c ?? '').trim() || `Column_${headerRow.indexOf(c)}`);
    const dataStart = options.headerRowIndex + 1;
    const dataRows = rawRows.slice(dataStart, dataStart + options.maxRows);
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
  async analyze(
    buffer: Buffer,
    sourceType: BudgetImportSourceType,
    options: { sheetName?: string; headerRowIndex?: number; sampleLimit?: number } = {},
  ): Promise<{
    columns: string[];
    sampleRows: ParsedSheetRow[];
    rowCount: number;
    sheetNames?: string[];
    activeSheetName?: string;
  }> {
    const sampleLimit = options.sampleLimit ?? 20;
    const result = await this.parse(buffer, sourceType, {
      ...options,
      maxRows: sampleLimit,
    });
    const fullCount =
      sourceType === 'XLSX'
        ? await this.countXlsxRows(buffer, options.sheetName, options.headerRowIndex ?? 0)
        : this.countCsvRows(buffer);
    const activeSheetName =
      sourceType === 'XLSX' ? (options.sheetName ?? result.sheetNames?.[0]) : undefined;
    return {
      columns: result.columns,
      sampleRows: result.rows,
      rowCount: Math.min(fullCount, MAX_ROWS),
      sheetNames: result.sheetNames,
      activeSheetName,
    };
  }

  private async countXlsxRows(buffer: Buffer, sheetName?: string, headerRowIndex = 0): Promise<number> {
    const workbook = await this.loadWorkbook(buffer);
    const name = sheetName ?? workbook.worksheets[0]?.name;
    const sheet = name ? workbook.getWorksheet(name) : undefined;
    if (!sheet) return 0;
    const rawRows = this.readSheetAsMatrix(sheet);
    const dataRows = rawRows.length - 1 - headerRowIndex;
    return Math.max(0, dataRows);
  }

  private countCsvRows(buffer: Buffer): number {
    const str = buffer.toString('utf-8');
    const lines = str.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return Math.max(0, lines.length - 1);
  }
}
