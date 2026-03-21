export function projectsList(): string {
  return '/projects';
}

export function projectNew(): string {
  return '/projects/new';
}

export function projectDetail(id: string): string {
  return `/projects/${id}`;
}
