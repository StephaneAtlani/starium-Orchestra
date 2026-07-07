import type { ProjectRaciMatrixApi } from '../types/project.types';

const EMPTY_RACI_MATRIX: ProjectRaciMatrixApi = {
  actions: [],
  actors: [],
  cells: [],
};

/** Normalise la réponse API (et invalide les anciennes entrées cache tableau). */
export function normalizeProjectRaciMatrix(raw: unknown): ProjectRaciMatrixApi {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return EMPTY_RACI_MATRIX;
  }

  const candidate = raw as Partial<ProjectRaciMatrixApi>;
  return {
    actions: Array.isArray(candidate.actions) ? candidate.actions : [],
    actors: Array.isArray(candidate.actors) ? candidate.actors : [],
    cells: Array.isArray(candidate.cells) ? candidate.cells : [],
  };
}
