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

function walk(node: unknown, depth: number): void {
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
        // Refuse hex / CSS libre ; seul colorToken allowlisté.
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
    for (const child of n.content) walk(child, depth + 1);
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
  walk(doc, 0);
  const serialized = JSON.stringify(doc);
  if (serialized.length > 500_000) {
    throw new BadRequestException('Contenu trop volumineux');
  }
  return doc;
}

export const EMPTY_PROCEDURE_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
} as const;
