import type { StrategicVisionDto } from '../types/strategic-vision.types';

export function hasVisionWorkflowContent(
  visions: StrategicVisionDto[],
  canUpdate: boolean,
  canCreate: boolean,
): boolean {
  if (canUpdate || canCreate) return true;
  const draftVisions = visions.filter(
    (item) => !item.isActive && !item.title.startsWith('ARCHIVE · '),
  );
  const archivedVisions = visions.filter((item) => item.title.startsWith('ARCHIVE · '));
  return draftVisions.length > 0 || archivedVisions.length > 0;
}

export function formatVisionWorkflowDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Non défini';
  return parsed.toLocaleString('fr-FR');
}

export function partitionStrategicVisions(visions: StrategicVisionDto[]) {
  const allVisions = [...visions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    allVisions,
    activeVision: allVisions.find((item) => item.isActive) ?? null,
    draftVisions: allVisions.filter(
      (item) => !item.isActive && !item.title.startsWith('ARCHIVE · '),
    ),
    archivedVisions: allVisions.filter((item) => item.title.startsWith('ARCHIVE · ')),
  };
}
