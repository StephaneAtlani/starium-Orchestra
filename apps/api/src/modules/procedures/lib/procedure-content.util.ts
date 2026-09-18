import { BadRequestException } from '@nestjs/common';

const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'text',
  'hardBreak',
]);

const ALLOWED_MARKS = new Set(['bold', 'italic', 'link']);

function assertHttpsHref(href: unknown): void {
  if (typeof href !== 'string' || !/^https:\/\//i.test(href)) {
    throw new BadRequestException(
      'Les liens doivent utiliser une URL https://',
    );
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
    if (level != null && (level < 1 || level > 3)) {
      throw new BadRequestException('Niveau de titre hors plage (1–3)');
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
      if (m.type === 'link') {
        assertHttpsHref((m.attrs as { href?: unknown } | undefined)?.href);
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
