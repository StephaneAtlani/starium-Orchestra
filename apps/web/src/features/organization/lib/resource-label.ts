/** Libellés affichage organisation (pas d’ID brut). */
export function resourcePickerLabel(r: {
  firstName: string | null;
  name: string;
  code: string | null;
}): string {
  const base = r.firstName ? `${r.firstName} ${r.name}`.trim() : r.name;
  const code = r.code ? ` — ${r.code}` : '';
  return `${base}${code}`;
}
