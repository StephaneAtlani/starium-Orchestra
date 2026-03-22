export function projectsList(): string {
  return '/projects';
}

/** Options / paramètres module Projets (placeholder). */
export function projectsOptions(): string {
  return '/projects/options';
}

export function projectNew(): string {
  return '/projects/new';
}

export function projectDetail(id: string): string {
  return `/projects/${id}`;
}

export function projectSheet(projectId: string): string {
  return `/projects/${projectId}/sheet`;
}
