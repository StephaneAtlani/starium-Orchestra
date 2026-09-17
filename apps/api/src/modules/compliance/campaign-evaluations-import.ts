import { createHash } from 'node:crypto';
import { parse as parseCsv } from 'csv-parse/sync';
import { ComplianceAssessmentStatus } from '@prisma/client';

export const CAMPAIGN_EVAL_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const CAMPAIGN_EVAL_IMPORT_MAX_ROWS = 10_000;

export const CAMPAIGN_EVAL_IMPORT_TEMPLATE = [
  'code;status;comment;lastAssessmentDate;evidenceNote',
  'A.1;PARTIEL;Analyse en cours;2026-09-01;',
  'A.2;CONFORME;Contrôle OK;2026-09-02;Observation terrain',
  'A.3;NA;Hors périmètre;;',
].join('\n');

const STATUS_ALIASES: Record<string, ComplianceAssessmentStatus> = {
  compliant: ComplianceAssessmentStatus.COMPLIANT,
  conforme: ComplianceAssessmentStatus.COMPLIANT,
  conf: ComplianceAssessmentStatus.COMPLIANT,
  partially_compliant: ComplianceAssessmentStatus.PARTIALLY_COMPLIANT,
  partial: ComplianceAssessmentStatus.PARTIALLY_COMPLIANT,
  partiel: ComplianceAssessmentStatus.PARTIALLY_COMPLIANT,
  part: ComplianceAssessmentStatus.PARTIALLY_COMPLIANT,
  non_compliant: ComplianceAssessmentStatus.NON_COMPLIANT,
  ecart: ComplianceAssessmentStatus.NON_COMPLIANT,
  écart: ComplianceAssessmentStatus.NON_COMPLIANT,
  nonconforme: ComplianceAssessmentStatus.NON_COMPLIANT,
  not_applicable: ComplianceAssessmentStatus.NOT_APPLICABLE,
  na: ComplianceAssessmentStatus.NOT_APPLICABLE,
  'n/a': ComplianceAssessmentStatus.NOT_APPLICABLE,
  nonapplicable: ComplianceAssessmentStatus.NOT_APPLICABLE,
};

export type ParsedEvalImportRow = {
  line: number;
  code: string;
  status: ComplianceAssessmentStatus | null;
  comment: string;
  lastAssessmentDate: string | null;
  evidenceNote: string | null;
  error: string | null;
};

export function normalizeImportHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s_-]+/g, '');
}

export function mapImportStatus(raw: string): ComplianceAssessmentStatus | null {
  const key = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s-]+/g, '_');
  return STATUS_ALIASES[key] ?? STATUS_ALIASES[key.replace(/_/g, '')] ?? null;
}

export function parseEvaluationsCsv(csvContent: string): {
  rows: ParsedEvalImportRow[];
  delimiter: string;
} {
  if (Buffer.byteLength(csvContent, 'utf8') > CAMPAIGN_EVAL_IMPORT_MAX_BYTES) {
    throw new Error('Fichier trop volumineux (max 5 Mo)');
  }
  const firstLine = csvContent.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const records = parseCsv(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    delimiter,
    bom: true,
  }) as Record<string, string>[];

  if (records.length > CAMPAIGN_EVAL_IMPORT_MAX_ROWS) {
    throw new Error(`Trop de lignes (max ${CAMPAIGN_EVAL_IMPORT_MAX_ROWS})`);
  }

  const rows: ParsedEvalImportRow[] = [];
  for (let i = 0; i < records.length; i++) {
    const raw = records[i]!;
    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      mapped[normalizeImportHeader(k)] = String(v ?? '').trim();
    }
    const code =
      mapped.code ??
      mapped.codecritere ??
      mapped.refid ??
      mapped.exigence ??
      '';
    const statusRaw =
      mapped.status ?? mapped.resultat ?? mapped.etat ?? mapped.evaluation ?? '';
    const comment =
      mapped.comment ?? mapped.constat ?? mapped.commentaire ?? mapped.note ?? '';
    const lastAssessmentDateRaw =
      mapped.lastassessmentdate ?? mapped.echeance ?? mapped.date ?? '';
    const evidenceNoteRaw =
      mapped.evidencenote ?? mapped.preuve ?? mapped.observation ?? '';

    let error: string | null = null;
    if (!code) error = 'Code exigence manquant';
    const status = statusRaw ? mapImportStatus(statusRaw) : null;
    if (!error && !status) error = `Statut inconnu « ${statusRaw} »`;
    if (!error && !comment) error = 'Commentaire obligatoire';

    rows.push({
      line: i + 2,
      code,
      status,
      comment,
      lastAssessmentDate: lastAssessmentDateRaw || null,
      evidenceNote: evidenceNoteRaw || null,
      error,
    });
  }

  return { rows, delimiter };
}

export function fingerprintImportRows(
  rows: Array<{
    code: string;
    status: string | null;
    comment: string;
    lastAssessmentDate: string | null;
    evidenceNote: string | null;
  }>,
): string {
  const normalized = rows.map((r) =>
    [
      r.code.trim().toLowerCase(),
      r.status ?? '',
      r.comment.trim(),
      r.lastAssessmentDate ?? '',
      r.evidenceNote ?? '',
    ].join('|'),
  );
  return createHash('sha256').update(normalized.join('\n'), 'utf8').digest('hex');
}
