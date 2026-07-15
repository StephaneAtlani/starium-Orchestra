import { BadRequestException } from '@nestjs/common';
import type { Project, ProjectStatus } from '@prisma/client';

/** Statuts projet pour lesquels la fiche projet est figée (lecture seule). */
export const PROJECT_SHEET_LOCKED_STATUSES: readonly ProjectStatus[] = [
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
];

export const PROJECT_SHEET_LOCKED_MESSAGE =
  'La fiche projet est verrouillée : le projet est terminé, annulé ou archivé. Modifiez le statut du projet pour la rouvrir.';

export function isProjectSheetEditingLocked(
  status: ProjectStatus | string,
): boolean {
  return (PROJECT_SHEET_LOCKED_STATUSES as readonly string[]).includes(status);
}

export function assertProjectSheetEditable(project: Pick<Project, 'status'>): void {
  if (isProjectSheetEditingLocked(project.status)) {
    throw new BadRequestException(PROJECT_SHEET_LOCKED_MESSAGE);
  }
}

/** Autorise un PATCH qui rouvre la fiche en changeant le statut vers un état non terminal. */
export function assertProjectSheetPatchAllowed(
  existing: Pick<Project, 'status'>,
  mergedStatus: ProjectStatus,
): void {
  if (!isProjectSheetEditingLocked(existing.status)) return;

  const reopening =
    mergedStatus !== existing.status && !isProjectSheetEditingLocked(mergedStatus);
  if (!reopening) {
    throw new BadRequestException(PROJECT_SHEET_LOCKED_MESSAGE);
  }
}
