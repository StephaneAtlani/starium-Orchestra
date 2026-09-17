import { displayLabel } from '@/lib/display-label';

export function frameworkDisplayLabel(framework: {
  name: string;
  version: string;
}): string {
  const name = displayLabel(framework.name, 'Référentiel');
  const version = displayLabel(framework.version, '');
  return version ? `${name} · ${version}` : name;
}
