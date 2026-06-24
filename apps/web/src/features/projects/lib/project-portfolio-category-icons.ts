import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BriefcaseBusiness,
  Cloud,
  Database,
  Eye,
  FolderKanban,
  GitBranch,
  KeyRound,
  Layers,
  Monitor,
  Network,
  Server,
  Shield,
  Smartphone,
  Workflow,
} from 'lucide-react';

/** Clés d’icône persistées sur `ProjectPortfolioCategory.icon`. */
export const PROJECT_PORTFOLIO_CATEGORY_ICONS = {
  folder: FolderKanban,
  briefcase: BriefcaseBusiness,
  layers: Layers,
  monitor: Monitor,
  shield: Shield,
  server: Server,
  database: Database,
  key: KeyRound,
  network: Network,
  cloud: Cloud,
  smartphone: Smartphone,
  gitBranch: GitBranch,
  observability: Eye,
  activity: Activity,
  workflow: Workflow,
} satisfies Record<string, LucideIcon>;

export type ProjectPortfolioCategoryIconKey = keyof typeof PROJECT_PORTFOLIO_CATEGORY_ICONS;

function normalizeCategoryText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function isPortfolioCategoryIconKey(value: string): value is ProjectPortfolioCategoryIconKey {
  return value in PROJECT_PORTFOLIO_CATEGORY_ICONS;
}

function kindFallbackIcon(kind: string): LucideIcon {
  return kind === 'ACTIVITY' ? Activity : FolderKanban;
}

const NAME_VISUAL_RULES: ReadonlyArray<{
  substrings: readonly string[];
  icon: ProjectPortfolioCategoryIconKey;
  /** Couleur accent (tokens thème) pour pastille sans config admin. */
  color: string;
}> = [
  { substrings: ['identite', 'acces', 'iam', 'sso'], icon: 'key', color: 'var(--color-violet-600)' },
  { substrings: ['data', 'integration', 'etl', 'api'], icon: 'database', color: 'var(--color-sky-600)' },
  {
    substrings: ['experience', 'client', 'canal', 'web', 'portail', 'appli', 'mobile'],
    icon: 'monitor',
    color: 'var(--color-cyan-600)',
  },
  { substrings: ['infra', 'reseau', 'network', 'cloud'], icon: 'server', color: 'var(--color-indigo-600)' },
  { substrings: ['cyber', 'securite', 'resilience', 'siem'], icon: 'shield', color: 'var(--destructive)' },
  {
    substrings: ['observabil', 'monitoring', 'supervision'],
    icon: 'observability',
    color: 'var(--color-emerald-600)',
  },
  {
    substrings: ['transformation', 'metier', 'business'],
    icon: 'briefcase',
    color: 'var(--starium-primary, var(--primary))',
  },
  { substrings: ['operation', 'plateforme', 'run', 'devops'], icon: 'layers', color: 'var(--color-violet-600)' },
  { substrings: ['processus', 'workflow'], icon: 'workflow', color: 'var(--color-fuchsia-600)' },
];

const ICON_KEY_COLORS: Record<ProjectPortfolioCategoryIconKey, string> = {
  folder: 'var(--muted-foreground)',
  briefcase: 'var(--starium-primary, var(--primary))',
  layers: 'var(--color-violet-600)',
  monitor: 'var(--color-cyan-600)',
  shield: 'var(--destructive)',
  server: 'var(--color-indigo-600)',
  database: 'var(--color-sky-600)',
  key: 'var(--color-violet-600)',
  network: 'var(--color-indigo-600)',
  cloud: 'var(--color-sky-600)',
  smartphone: 'var(--color-cyan-600)',
  gitBranch: 'var(--color-fuchsia-600)',
  observability: 'var(--color-emerald-600)',
  activity: 'var(--color-amber-600)',
  workflow: 'var(--color-fuchsia-600)',
};

function categoryNamesHaystack(...names: Array<string | null | undefined>): string {
  return names
    .filter((name): name is string => Boolean(name?.trim()))
    .map((name) => normalizeCategoryText(name))
    .join(' ');
}

function visualFromCategoryNames(...names: Array<string | null | undefined>) {
  const haystack = categoryNamesHaystack(...names);
  if (!haystack) return null;

  for (const rule of NAME_VISUAL_RULES) {
    if (rule.substrings.some((fragment) => haystack.includes(fragment))) {
      return rule;
    }
  }
  return null;
}

function iconFromCategoryNames(...names: Array<string | null | undefined>): LucideIcon | null {
  const rule = visualFromCategoryNames(...names);
  return rule ? PROJECT_PORTFOLIO_CATEGORY_ICONS[rule.icon] : null;
}

export function resolvePortfolioCategoryLucideIcon(params: {
  icon: string | null | undefined;
  categoryName: string | null | undefined;
  parentName: string | null | undefined;
  projectKind: string;
}): LucideIcon {
  const configured = (params.icon ?? '').trim();
  if (configured && isPortfolioCategoryIconKey(configured)) {
    return PROJECT_PORTFOLIO_CATEGORY_ICONS[configured];
  }

  const fromName = iconFromCategoryNames(params.categoryName, params.parentName);
  if (fromName) return fromName;

  return kindFallbackIcon(params.projectKind);
}

/** Couleur accent pastille — config admin, puis heuristique libellé / icône. */
export function resolvePortfolioCategoryColor(params: {
  color: string | null | undefined;
  icon: string | null | undefined;
  categoryName: string | null | undefined;
  parentName: string | null | undefined;
  projectKind: string;
}): string | null {
  const configured = (params.color ?? '').trim();
  if (configured) return configured;

  const fromName = visualFromCategoryNames(params.categoryName, params.parentName);
  if (fromName) return fromName.color;

  const iconKey = (params.icon ?? '').trim();
  if (iconKey && isPortfolioCategoryIconKey(iconKey)) {
    return ICON_KEY_COLORS[iconKey];
  }

  if (!params.categoryName?.trim() && !params.parentName?.trim()) {
    return params.projectKind === 'ACTIVITY'
      ? 'var(--color-amber-600)'
      : 'var(--starium-primary, var(--primary))';
  }

  return 'var(--muted-foreground)';
}
