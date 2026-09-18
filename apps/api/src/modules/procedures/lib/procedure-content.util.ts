import { BadRequestException } from '@nestjs/common';

const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'text',
  'hardBreak',
  'procedureImage',
  'procedureFile',
]);

const ALLOWED_MARKS = new Set([
  'bold',
  'italic',
  'underline',
  'strike',
  'link',
  'textStyle',
  'highlight',
]);

/** Tokens texte (mark textStyle.colorToken). */
export const PROCEDURE_TEXT_COLOR_TOKENS = new Set([
  'ink',
  'muted',
  'brand',
  'danger',
  'success',
  'warning',
  'info',
]);

/** Tokens surlignage (mark highlight.colorToken ou highlight.color). */
export const PROCEDURE_HIGHLIGHT_COLOR_TOKENS = new Set([
  'brandSoft',
  'dangerSoft',
  'successSoft',
  'warningSoft',
  'infoSoft',
]);

const CODE_LANGUAGE_RE = /^[a-zA-Z0-9_-]{0,32}$/;
const ASSET_ID_RE = /^[a-z0-9_-]{8,64}$/i;

function assertHttpsHref(href: unknown): void {
  if (typeof href !== 'string' || !/^https:\/\//i.test(href)) {
    throw new BadRequestException(
      'Les liens doivent utiliser une URL https://',
    );
  }
}

function assertColorToken(
  raw: unknown,
  allowed: Set<string>,
  kind: string,
): void {
  if (raw == null || raw === '') return;
  if (typeof raw !== 'string' || !allowed.has(raw)) {
    throw new BadRequestException(`Jeton de couleur ${kind} non autorisé`);
  }
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

function walk(node: unknown, depth: number, assetIds: Set<string>): void {
  if (depth > 40) {
    throw new BadRequestException('Document trop profond');
  }
  if (!node || typeof node !== 'object') {
    throw new BadRequestException('Noeud de contenu invalide');
  }
  const n = node as Record<string, unknown>;
  const type = n.type;
  if (typeof type !== 'string' || !ALLOWED_NODES.has(type)) {
    throw new BadRequestException(`Type de noeud non autorisé: ${String(type)}`);
  }
  if (type === 'heading') {
    const level = (n.attrs as { level?: number } | undefined)?.level;
    if (level != null && (level < 1 || level > 6)) {
      throw new BadRequestException('Niveau de titre hors plage (1–6)');
    }
  }
  if (type === 'codeBlock') {
    const language = (n.attrs as { language?: unknown } | undefined)?.language;
    if (language != null && language !== '') {
      if (typeof language !== 'string' || !CODE_LANGUAGE_RE.test(language)) {
        throw new BadRequestException('Langage de codeBlock invalide');
      }
    }
  }
  if (type === 'procedureImage') {
    const attrs = (n.attrs ?? {}) as Record<string, unknown>;
    assetIds.add(assertAssetId(attrs.assetId));
    assertNonEmptyString(attrs.alt, 'Texte alternatif (alt)');
  }
  if (type === 'procedureFile') {
    const attrs = (n.attrs ?? {}) as Record<string, unknown>;
    assetIds.add(assertAssetId(attrs.assetId));
    assertNonEmptyString(attrs.label, 'Libellé du fichier');
  }
  if (Array.isArray(n.marks)) {
    for (const mark of n.marks) {
      if (!mark || typeof mark !== 'object') {
        throw new BadRequestException('Marque invalide');
      }
      const m = mark as Record<string, unknown>;
      if (typeof m.type !== 'string' || !ALLOWED_MARKS.has(m.type)) {
        throw new BadRequestException(
          `Marque non autorisée: ${String(m.type)}`,
        );
      }
      const attrs = (m.attrs ?? {}) as Record<string, unknown>;
      if (m.type === 'link') {
        assertHttpsHref(attrs.href);
      }
      if (m.type === 'textStyle') {
        if (attrs.color != null && attrs.color !== '') {
          throw new BadRequestException(
            'Couleur texte libre interdite — utilisez colorToken',
          );
        }
        assertColorToken(
          attrs.colorToken,
          PROCEDURE_TEXT_COLOR_TOKENS,
          'texte',
        );
      }
      if (m.type === 'highlight') {
        const token = attrs.colorToken ?? attrs.color;
        assertColorToken(token, PROCEDURE_HIGHLIGHT_COLOR_TOKENS, 'surlignage');
      }
    }
  }
  if (Array.isArray(n.content)) {
    for (const child of n.content) walk(child, depth + 1, assetIds);
  }
}

/** Valide un document TipTap/ProseMirror whitelisté. */
export function assertProcedureContentJson(
  contentJson: unknown,
): Record<string, unknown> {
  if (!contentJson || typeof contentJson !== 'object') {
    throw new BadRequestException('contentJson invalide');
  }
  const doc = contentJson as Record<string, unknown>;
  if (doc.type !== 'doc') {
    throw new BadRequestException('La racine doit être un document (type doc)');
  }
  walk(doc, 0, new Set());
  const serialized = JSON.stringify(doc);
  if (serialized.length > 500_000) {
    throw new BadRequestException('Contenu trop volumineux');
  }
  return doc;
}

/** Collecte les assetId référencés dans le document (sans re-valider le schéma). */
export function collectProcedureAssetIds(contentJson: unknown): string[] {
  const ids = new Set<string>();
  const walkCollect = (node: unknown, depth: number) => {
    if (depth > 40 || !node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'procedureImage' || n.type === 'procedureFile') {
      const assetId = (n.attrs as { assetId?: unknown } | undefined)?.assetId;
      if (typeof assetId === 'string' && assetId.trim()) {
        ids.add(assetId.trim());
      }
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walkCollect(child, depth + 1);
    }
  };
  walkCollect(contentJson, 0);
  return [...ids];
}

export const EMPTY_PROCEDURE_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
} as const;
