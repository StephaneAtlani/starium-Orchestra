import { ProjectStatus, Prisma } from '@prisma/client';

/**
 * Filtre partagé des projets "actifs" pour les KPI portefeuille/alignement :
 * projets client hors états terminaux/non-actifs.
 *
 * Exclus explicitement:
 * - ARCHIVED
 * - CANCELLED
 * - COMPLETED
 */
export function activePortfolioProjectsWhere(
  clientId: string,
): Prisma.ProjectWhereInput {
  return {
    clientId,
    status: {
      notIn: [
        ProjectStatus.ARCHIVED,
        ProjectStatus.CANCELLED,
        ProjectStatus.COMPLETED,
      ],
    },
  };
}
