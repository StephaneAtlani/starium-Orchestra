import { ProjectStatus, Prisma } from '@prisma/client';

/**
 * Filtre partagé des projets "actifs" pour les KPI portefeuille/alignement :
 * tout projet client sauf ARCHIVED.
 */
export function activePortfolioProjectsWhere(
  clientId: string,
): Prisma.ProjectWhereInput {
  return {
    clientId,
    status: { not: ProjectStatus.ARCHIVED },
  };
}
