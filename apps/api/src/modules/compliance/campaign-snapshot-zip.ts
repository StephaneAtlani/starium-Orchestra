import JSZip from 'jszip';

/** Échappe les formules tableur (=, +, -, @) en tête de cellule. */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  const formulaSafe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (/[;"\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const lines = [
    headers.map(escapeCsvCell).join(';'),
    ...rows.map((r) => r.map(escapeCsvCell).join(';')),
  ];
  return `${lines.join('\n')}\n`;
}

export type SnapshotExportPayload = {
  capturedAt?: string;
  campaign?: {
    name?: string;
    status?: string;
    frozenFrameworkName?: string;
    frozenFrameworkVersion?: string;
  };
  totals?: {
    requirementCount?: number;
    compliantCount?: number;
    partiallyCompliantCount?: number;
    nonCompliantCount?: number;
    notApplicableCount?: number;
    notAssessedCount?: number;
    applicableCount?: number;
    compliancePercent?: number | null;
  };
  requirements?: Array<{
    code?: string;
    title?: string;
    category?: string;
    status?: string | null;
    comment?: string | null;
    lastAssessmentDate?: string | null;
    evidenceCount?: number;
  }>;
};

export type EvidenceManifestRow = {
  code: string;
  name: string;
  kind: string;
  hasUrl: boolean;
  hasFile: boolean;
  isObservation: boolean;
};

export function buildSnapshotSyntheseHtml(
  label: string | null,
  payload: SnapshotExportPayload,
): string {
  const t = payload.totals ?? {};
  const camp = payload.campaign ?? {};
  const score =
    t.compliancePercent == null ? 'Non calculable' : `${t.compliancePercent} %`;
  const title = label?.trim() || 'Instantané conformité';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;color:#14130F;background:#FAF9F7}
h1{font-size:1.5rem}
.meta,.kpi{margin:.5rem 0}
.kpi span{display:inline-block;margin-right:1rem}
table{border-collapse:collapse;width:100%;margin-top:1.5rem;font-size:.875rem}
th,td{border-bottom:1px solid #E9E6E0;padding:.5rem;text-align:left}
th{font-weight:600}
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="meta">Référentiel : ${escapeHtml(camp.frozenFrameworkName ?? '—')}
 (${escapeHtml(camp.frozenFrameworkVersion ?? '—')}) · Campagne :
 ${escapeHtml(camp.name ?? '—')} · Statut campagne :
 ${escapeHtml(camp.status ?? '—')}</p>
<p class="meta">Capturé le : ${escapeHtml(payload.capturedAt ?? '—')}</p>
<p class="kpi">
<span>Score C/A : <strong>${escapeHtml(score)}</strong></span>
<span>C ${t.compliantCount ?? 0}</span>
<span>P ${t.partiallyCompliantCount ?? 0}</span>
<span>É ${t.nonCompliantCount ?? 0}</span>
<span>NA ${t.notApplicableCount ?? 0}</span>
<span>N.É. ${t.notAssessedCount ?? 0}</span>
<span>Total ${t.requirementCount ?? 0}</span>
</p>
<table>
<thead><tr><th>Code</th><th>Titre</th><th>Domaine</th><th>Statut</th><th>Preuves</th></tr></thead>
<tbody>
${(payload.requirements ?? [])
  .map(
    (r) =>
      `<tr><td>${escapeHtml(r.code ?? '')}</td><td>${escapeHtml(r.title ?? '')}</td><td>${escapeHtml(r.category ?? '')}</td><td>${escapeHtml(r.status ?? 'NON_EVALUE')}</td><td>${r.evidenceCount ?? 0}</td></tr>`,
  )
  .join('\n')}
</tbody>
</table>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function buildCampaignSnapshotZip(opts: {
  label: string | null;
  payload: SnapshotExportPayload;
  evidences: EvidenceManifestRow[];
}): Promise<Buffer> {
  const zip = new JSZip();
  const payload = opts.payload;
  zip.file('synthese.html', buildSnapshotSyntheseHtml(opts.label, payload));
  zip.file('snapshot.json', JSON.stringify(payload, null, 2));
  zip.file(
    'evaluations.csv',
    toCsv(
      [
        'code',
        'title',
        'category',
        'status',
        'comment',
        'lastAssessmentDate',
        'evidenceCount',
      ],
      (payload.requirements ?? []).map((r) => [
        r.code ?? '',
        r.title ?? '',
        r.category ?? '',
        r.status ?? '',
        r.comment ?? '',
        r.lastAssessmentDate
          ? new Date(r.lastAssessmentDate).toISOString().slice(0, 10)
          : '',
        r.evidenceCount ?? 0,
      ]),
    ),
  );
  zip.file(
    'preuves-manifeste.csv',
    toCsv(
      ['code', 'name', 'kind', 'hasUrl', 'hasFile', 'isObservation'],
      opts.evidences.map((e) => [
        e.code,
        e.name,
        e.kind,
        e.hasUrl ? 'oui' : 'non',
        e.hasFile ? 'oui' : 'non',
        e.isObservation ? 'oui' : 'non',
      ]),
    ),
  );
  const buf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  return Buffer.from(buf);
}
