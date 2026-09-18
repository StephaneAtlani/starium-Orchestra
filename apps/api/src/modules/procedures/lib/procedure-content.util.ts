import { BadRequestException } from '@nestjs/common';

const TEXT_BLOCK_TYPES = new Set([
  'h1',
  'h2',
  'h3',
  'p',
  'ul',
  'ol',
  'step',
]);

const BLOCK_TYPES = new Set([
  ...TEXT_BLOCK_TYPES,
  'callout',
  'img',
  'video',
  'diag',
]);

const DIAG_KINDS = new Set([
  'start',
  'step',
  'dec',
  'doc',
  'actor',
  'end',
]);

const ASSET_ID_RE = /^[a-z0-9_-]{8,64}$/i;
const ALLOWED_HTML_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'a',
  'mark',
  'br',
  'li',
]);

export const EMPTY_PROCEDURE_DOC = {
  schemaVersion: 2,
  blocks: [
    { t: 'h1', html: '' },
    { t: 'p', html: '' },
  ],
} as const;

function assertHttpsHref(href: unknown): string {
  if (typeof href !== 'string' || !/^https:\/\//i.test(href)) {
    throw new BadRequestException(
      'Les liens doivent utiliser une URL https://',
    );
  }
  return href.trim();
}

function assertNonEmptyString(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new BadRequestException(`${field} obligatoire`);
  }
  return raw.trim();
}

function assertAssetId(raw: unknown): string {
  const id = assertNonEmptyString(raw, 'assetId');
  if (!ASSET_ID_RE.test(id)) {
    throw new BadRequestException('assetId invalide');
  }
  return id;
}

/** Sanitize HTML allowlist (tags + a[href https]). */
export function sanitizeProcedureHtml(html: unknown): string {
  if (html == null) return '';
  if (typeof html !== 'string') {
    throw new BadRequestException('html de bloc invalide');
  }
  let out = html;
  // Strip comments / scripts / styles entirely (with body)
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(
    /<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  out = out.replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, '');
  // Normalize void br
  out = out.replace(/<br\s*\/?>/gi, '<br>');
  // Remove disallowed tags (keep inner text)
  out = out.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, tag: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(t)) return '';
    if (t === 'br') return '<br>';
    if (full.startsWith('</')) return `</${t}>`;
    if (t === 'a') {
      const hrefMatch = full.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = hrefMatch
        ? (hrefMatch[2] ?? hrefMatch[3] ?? hrefMatch[4] ?? '').trim()
        : '';
      if (!/^https:\/\//i.test(href)) {
        throw new BadRequestException(
          'Les liens doivent utiliser une URL https://',
        );
      }
      const safe = href.replace(/"/g, '&quot;');
      return `<a href="${safe}">`;
    }
    return `<${t}>`;
  });
  if (out.length > 50_000) {
    throw new BadRequestException('HTML de bloc trop volumineux');
  }
  return out;
}

function assertDiagNode(raw: unknown, ids: Set<string>): void {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('Nœud de schéma invalide');
  }
  const n = raw as Record<string, unknown>;
  const id = assertNonEmptyString(n.id, 'diag.node.id');
  if (ids.has(id)) {
    throw new BadRequestException('Identifiant de nœud de schéma dupliqué');
  }
  ids.add(id);
  if (typeof n.k !== 'string' || !DIAG_KINDS.has(n.k)) {
    throw new BadRequestException(`Type de forme non autorisé: ${String(n.k)}`);
  }
  if (typeof n.x !== 'number' || typeof n.y !== 'number' || !Number.isFinite(n.x) || !Number.isFinite(n.y)) {
    throw new BadRequestException('Coordonnées de forme invalides');
  }
  if (n.x < 0 || n.y < 0) {
    throw new BadRequestException('Coordonnées de forme hors bornes');
  }
  assertNonEmptyString(n.label, 'diag.node.label');
  if (n.desc != null && typeof n.desc !== 'string') {
    throw new BadRequestException('Description de forme invalide');
  }
  if (typeof n.desc === 'string' && n.desc.length > 2000) {
    throw new BadRequestException('Description de forme trop longue');
  }
}

function assertDiagEdge(raw: unknown, nodeIds: Set<string>): void {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('Lien de schéma invalide');
  }
  const e = raw as Record<string, unknown>;
  const from = assertNonEmptyString(e.from, 'diag.edge.from');
  const to = assertNonEmptyString(e.to, 'diag.edge.to');
  if (!nodeIds.has(from) || !nodeIds.has(to)) {
    throw new BadRequestException('Lien de schéma référence une forme inconnue');
  }
  if (e.label != null) {
    if (typeof e.label !== 'string' || e.label.length > 200) {
      throw new BadRequestException('Libellé de lien invalide');
    }
  }
}

function assertBlock(raw: unknown, assetIds: Set<string>): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('Bloc invalide');
  }
  const b = raw as Record<string, unknown>;
  const t = b.t;
  if (typeof t !== 'string' || !BLOCK_TYPES.has(t)) {
    throw new BadRequestException(`Type de bloc non autorisé: ${String(t)}`);
  }

  if (TEXT_BLOCK_TYPES.has(t)) {
    return { t, html: sanitizeProcedureHtml(b.html) };
  }
  if (t === 'callout') {
    const kind = b.kind === 'info' ? 'info' : 'warn';
    return { t, kind, html: sanitizeProcedureHtml(b.html) };
  }
  if (t === 'img') {
    const assetId = assertAssetId(b.assetId);
    assetIds.add(assetId);
    return {
      t,
      assetId,
      alt: assertNonEmptyString(b.alt ?? 'Image de la procédure', 'alt'),
      cap: sanitizeProcedureHtml(b.cap ?? ''),
    };
  }
  if (t === 'video') {
    return {
      t,
      src: assertHttpsHref(b.src),
      cap: sanitizeProcedureHtml(b.cap ?? ''),
    };
  }
  // diag
  const nodesRaw = b.nodes;
  const edgesRaw = b.edges;
  if (!Array.isArray(nodesRaw) || !Array.isArray(edgesRaw)) {
    throw new BadRequestException('Schéma : nodes et edges obligatoires');
  }
  if (nodesRaw.length > 200 || edgesRaw.length > 400) {
    throw new BadRequestException('Schéma trop volumineux');
  }
  const nodeIds = new Set<string>();
  for (const node of nodesRaw) assertDiagNode(node, nodeIds);
  const edgeKeys = new Set<string>();
  for (const edge of edgesRaw) {
    assertDiagEdge(edge, nodeIds);
    const e = edge as { from: string; to: string };
    const key = `${e.from}->${e.to}`;
    if (edgeKeys.has(key)) {
      throw new BadRequestException('Lien de schéma dupliqué');
    }
    edgeKeys.add(key);
  }
  const title =
    typeof b.title === 'string' ? b.title.trim().slice(0, 200) : '';
  return {
    t: 'diag',
    title,
    cap: sanitizeProcedureHtml(b.cap ?? ''),
    nodes: nodesRaw,
    edges: edgesRaw,
  };
}

/** Valide contentJson procédures v2 (blocs). */
export function assertProcedureContentJson(
  contentJson: unknown,
): Record<string, unknown> {
  if (!contentJson || typeof contentJson !== 'object') {
    throw new BadRequestException('contentJson invalide');
  }
  const doc = contentJson as Record<string, unknown>;
  if (doc.type === 'doc' || doc.schemaVersion !== 2) {
    throw new BadRequestException(
      'Format TipTap obsolète — contentJson schemaVersion 2 (blocks) requis',
    );
  }
  if (!Array.isArray(doc.blocks)) {
    throw new BadRequestException('blocks[] obligatoire');
  }
  if (doc.blocks.length === 0) {
    throw new BadRequestException('Au moins un bloc est requis');
  }
  if (doc.blocks.length > 200) {
    throw new BadRequestException('Trop de blocs (max 200)');
  }
  const assetIds = new Set<string>();
  const blocks = doc.blocks.map((b) => assertBlock(b, assetIds));
  const out = { schemaVersion: 2, blocks };
  const serialized = JSON.stringify(out);
  if (serialized.length > 500_000) {
    throw new BadRequestException('Contenu trop volumineux');
  }
  return out;
}

export function collectProcedureAssetIds(contentJson: unknown): string[] {
  const ids = new Set<string>();
  if (!contentJson || typeof contentJson !== 'object') return [];
  const doc = contentJson as { blocks?: unknown };
  if (!Array.isArray(doc.blocks)) return [];
  for (const block of doc.blocks) {
    if (!block || typeof block !== 'object') continue;
    const b = block as { t?: string; assetId?: unknown };
    if (b.t === 'img' && typeof b.assetId === 'string' && b.assetId.trim()) {
      ids.add(b.assetId.trim());
    }
  }
  return [...ids];
}

/** Contenu considéré vide pour transition revue/publish. */
export function isProcedureContentEmpty(contentJson: unknown): boolean {
  if (!contentJson || typeof contentJson !== 'object') return true;
  const doc = contentJson as { blocks?: unknown[] };
  if (!Array.isArray(doc.blocks) || doc.blocks.length === 0) return true;
  return doc.blocks.every((raw) => {
    if (!raw || typeof raw !== 'object') return true;
    const b = raw as Record<string, unknown>;
    if (b.t === 'img') return !b.assetId;
    if (b.t === 'video') return !b.src;
    if (b.t === 'diag') {
      return !Array.isArray(b.nodes) || b.nodes.length === 0;
    }
    const html = typeof b.html === 'string' ? b.html.replace(/<[^>]+>/g, '').trim() : '';
    return html.length === 0;
  });
}

export function countProcedureBlocks(contentJson: unknown): number {
  if (!contentJson || typeof contentJson !== 'object') return 0;
  const blocks = (contentJson as { blocks?: unknown }).blocks;
  return Array.isArray(blocks) ? blocks.length : 0;
}
