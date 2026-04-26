import type { StrategicAxisIconKey } from '../components/strategic-axis-icons';

function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Heuristique pour l’aperçu dans les dialogs : si l’utilisateur n’a pas choisi d’icône Lucide,
 * on propose un exemple cohérent avec des mots du titre. Rien n’est persisté tant que l’icône
 * n’est pas sélectionnée explicitement.
 */
export function suggestStrategicAxisIconKeyFromTitle(title: string): StrategicAxisIconKey | null {
  const t = normalizeTitle(title);
  if (!t) return null;

  const rules: ReadonlyArray<{ substrings: readonly string[]; icon: StrategicAxisIconKey }> = [
    { substrings: ['securite', 'security', 'cyber', 'risque', 'conformite'], icon: 'shield' },
    { substrings: ['cible', 'objectif', 'okr'], icon: 'target' },
    { substrings: ['transformation', 'innovation', 'lancement', 'agile'], icon: 'rocket' },
    { substrings: ['croissance', 'growth', 'revenue', 'vente'], icon: 'trendingUp' },
    { substrings: ['performance', 'kpi', 'indicateur', 'mesure'], icon: 'barChart' },
    { substrings: ['architecture', 'stack', 'technique'], icon: 'layers' },
    { substrings: ['business', 'commercial', 'marche'], icon: 'briefcase' },
    { substrings: ['gouvernance', 'compliance', 'audit'], icon: 'governance' },
    { substrings: ['processus', 'workflow', 'flux'], icon: 'workflow' },
    { substrings: ['operation', 'operat', 'efficacite', 'qualite'], icon: 'settings' },
  ];

  for (const { substrings, icon } of rules) {
    if (substrings.some((s) => t.includes(s))) return icon;
  }
  return null;
}
