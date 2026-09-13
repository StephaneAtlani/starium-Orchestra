import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import type { ProjectDocumentApi } from '../types/project.types';
import { projectDocumentTypeLabel } from './project-document-accept';

export type ProjectDocumentVisualTone = 'pdf' | 'xls' | 'doc' | 'fig' | 'img' | 'zip' | 'link' | 'file';

export function projectDocumentVisualTone(doc: {
  extension?: string | null;
  mimeType?: string | null;
  name?: string;
  storageType?: string | null;
}): ProjectDocumentVisualTone {
  if (doc.storageType === 'EXTERNAL') return 'link';
  const label = projectDocumentTypeLabel(doc).toLowerCase();
  if (label === 'pdf') return 'pdf';
  if (label === 'xlsx' || label === 'xls' || label === 'csv') return 'xls';
  if (label === 'docx' || label === 'doc' || label === 'txt') return 'doc';
  if (label === 'fig') return 'fig';
  if (label === 'png' || label === 'jpg' || label === 'jpeg' || label === 'webp' || label === 'img') {
    return 'img';
  }
  if (label === 'zip') return 'zip';
  return 'file';
}

export function projectDocumentIcoClass(tone: ProjectDocumentVisualTone): string {
  return `starium-doc-ico starium-doc-ico--${tone}`;
}

export function projectDocumentBadgeClass(tone: ProjectDocumentVisualTone): string {
  switch (tone) {
    case 'pdf':
      return 'starium-ds-badge starium-ds-badge--danger starium-ds-badge--nodot';
    case 'xls':
      return 'starium-ds-badge starium-ds-badge--success starium-ds-badge--nodot';
    case 'doc':
      return 'starium-ds-badge starium-ds-badge--info starium-ds-badge--nodot';
    case 'fig':
    case 'link':
      return 'starium-ds-badge starium-ds-badge--purple starium-ds-badge--nodot';
    case 'img':
      return 'starium-ds-badge starium-ds-badge--warn starium-ds-badge--nodot';
    default:
      return 'starium-ds-badge starium-ds-badge--neutral starium-ds-badge--nodot';
  }
}

export function projectDocumentBadgeLabel(doc: {
  extension?: string | null;
  mimeType?: string | null;
  name?: string;
  storageType?: string | null;
}): string {
  if (doc.storageType === 'EXTERNAL') return 'Lien';
  const raw = projectDocumentTypeLabel(doc);
  if (raw === 'XLSX' || raw === 'XLS') return 'Excel';
  if (raw === 'DOCX' || raw === 'DOC') return 'Word';
  if (raw === 'JPG' || raw === 'JPEG') return 'JPEG';
  return raw;
}

export function projectDocumentAuthorShort(
  user: ProjectDocumentApi['uploadedByUser'],
): string {
  if (!user) return 'Auteur inconnu';
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  if (first && last) return `${first} ${last.charAt(0)}.`;
  return firstDisplayLabel(
    [ [first, last].filter(Boolean).join(' '), user.email ],
    'Auteur inconnu',
  );
}

export function projectDocumentAuthorFull(
  user: ProjectDocumentApi['uploadedByUser'],
): string {
  if (!user) return 'Auteur inconnu';
  return firstDisplayLabel(
    [
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
      user.email,
    ],
    'Auteur inconnu',
  );
}

export function formatProjectDocumentBytes(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let v = Math.max(0, bytes);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const s = i === 0 ? String(Math.round(v)) : v.toFixed(v < 10 ? 1 : 0).replace('.', ',');
  return `${s} ${units[i]}`;
}

export function formatProjectDocumentDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export function formatProjectDocumentRelative(iso: string, now = Date.now()): string {
  try {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '—';
    const diffMs = now - t;
    const min = Math.round(diffMs / 60_000);
    if (min < 1) return 'À l’instant';
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `Il y a ${h} h`;
    const d = Math.round(h / 24);
    if (d === 1) {
      return `Hier à ${new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))}`;
    }
    if (d < 7) return `Il y a ${d} j`;
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export function projectDocumentActivityVerb(doc: ProjectDocumentApi): string {
  const created = new Date(doc.createdAt).getTime();
  const updated = new Date(doc.updatedAt).getTime();
  if (
    Number.isFinite(created) &&
    Number.isFinite(updated) &&
    Math.abs(updated - created) < 60_000
  ) {
    return 'a ajouté';
  }
  return 'a mis à jour';
}

export function projectDocumentDisplayName(doc: ProjectDocumentApi): string {
  return displayLabel(doc.name, 'Document sans titre');
}
