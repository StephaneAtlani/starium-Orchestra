import { navigation } from '@/config/navigation';

export type WorkspaceBreadcrumbItem = {
  label: string;
  href?: string;
};

export type WorkspaceBreadcrumbOverride = {
  /** Remplace entièrement le fil calculé. */
  items?: WorkspaceBreadcrumbItem[];
  /** Libellé métier pour le segment dynamique (UUID, etc.). */
  entityLabel?: string;
  entityHref?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SECTION_LABELS: Record<string, string> = {
  ACCUEIL: 'Accueil',
  'PILOTAGE STRATÉGIQUE': 'Pilotage',
  'PILOTAGE FINANCIER': 'Pilotage financier',
  ORGANISATION: 'Organisation',
  'GOUVERNANCE & CONFORMITÉ': 'Gouvernance',
  ADMINISTRATION: 'Administration',
  Platform: 'Plateforme',
  Security: 'Sécurité',
};

const STATIC_SEGMENT_LABELS: Record<string, string> = {
  new: 'Nouveau',
  edit: 'Modifier',
  tasks: 'Tâches',
  planning: 'Planning',
  scenarios: 'Scénarios',
  cockpit: 'Cockpit',
  sheet: 'Fiche projet',
  options: 'Options',
  risks: 'Risques',
  budget: 'Budget',
  reporting: 'Reporting',
  snapshots: 'Snapshots',
  lines: 'Lignes',
  envelopes: 'Enveloppes',
  imports: 'Imports',
  exercises: 'Exercices',
  configuration: 'Configuration',
  dashboard: 'Dashboard',
  contacts: 'Contacts',
  invoices: 'Factures',
  'purchase-orders': 'Commandes',
  'kind-types': 'Types de contrat',
  members: 'Membres',
  roles: 'Rôles',
  collaborators: 'Collaborateurs',
  skills: 'Compétences',
  structure: 'Structure',
  'time-entries': 'Temps',
  explore: 'Explorer',
  article: 'Article',
  category: 'Catégorie',
  requirements: 'Exigences',
  subscriptions: 'Abonnements',
  licenses: 'Licences',
  'portfolio-gantt': 'Frise portefeuille',
  requests: 'Demandes projet',
  committee: 'Comité',
  codir: 'CODIR',
  reallocations: 'Réallocations',
  account: 'Compte',
};

function crumb(label: string, href?: string): WorkspaceBreadcrumbItem {
  return href ? { label, href } : { label };
}

function sectionCrumb(sectionKey: string, href?: string): WorkspaceBreadcrumbItem {
  return crumb(SECTION_LABELS[sectionKey] ?? sectionKey, href);
}

function isDynamicSegment(segment: string): boolean {
  return UUID_RE.test(segment) || /^\d+$/.test(segment);
}

function humanizeSegment(segment: string): string {
  if (STATIC_SEGMENT_LABELS[segment]) return STATIC_SEGMENT_LABELS[segment];
  if (isDynamicSegment(segment)) return '…';
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

type NavLeaf = {
  href: string;
  label: string;
  section: string;
  parentLabel?: string;
};

function flattenNavigation(): NavLeaf[] {
  const leaves: NavLeaf[] = [];
  for (const section of navigation) {
    for (const item of section.items) {
      if (item.href) {
        leaves.push({ href: item.href, label: item.label, section: section.section });
      }
      for (const child of item.children ?? []) {
        if (child.href) {
          leaves.push({
            href: child.href,
            label: child.label,
            section: section.section,
            parentLabel: item.label,
          });
        }
      }
    }
  }
  return leaves;
}

const NAV_LEAVES = flattenNavigation();

function pathnameMatchesNavHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  if (href === '/budgets/dashboard') {
    return pathname.startsWith('/budgets/dashboard');
  }
  if (href === '/budgets/configuration') {
    return (
      pathname.startsWith('/budgets/configuration') ||
      pathname.startsWith('/budgets/exercises') ||
      pathname.startsWith('/budgets/imports')
    );
  }
  if (href === '/budgets') {
    const sub = pathname.slice('/budgets/'.length);
    const first = sub.split('/')[0];
    return !['dashboard', 'configuration', 'exercises', 'imports', 'cockpit-settings', 'snapshot-occasion-types'].includes(
      first,
    );
  }
  if (href === '/projects/requests') {
    return pathname.startsWith('/projects/requests');
  }
  if (href === '/projects/options') {
    return pathname.startsWith('/projects/options');
  }
  if (href === '/projects') {
    if (pathname.startsWith('/projects/requests')) return false;
    if (pathname.startsWith('/projects/options')) return false;
    if (pathname.startsWith('/projects/committee')) return false;
    return true;
  }
  if (href === '/suppliers/dashboard') {
    return pathname.startsWith('/suppliers/dashboard');
  }
  if (href === '/suppliers/contacts') {
    return pathname.startsWith('/suppliers/contacts');
  }
  if (href === '/suppliers') {
    const sub = pathname.slice('/suppliers/'.length);
    const first = sub.split('/')[0];
    return !['dashboard', 'contacts'].includes(first);
  }
  if (href === '/contracts/kind-types') {
    return pathname.startsWith('/contracts/kind-types');
  }
  if (href === '/contracts') {
    return !pathname.startsWith('/contracts/kind-types');
  }

  return true;
}

function findNavLeaf(pathname: string): NavLeaf | null {
  const matches = NAV_LEAVES.filter((leaf) => pathnameMatchesNavHref(pathname, leaf.href));
  if (!matches.length) return null;
  return matches.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

function moduleHref(leaf: NavLeaf): string {
  if (!leaf.parentLabel) return leaf.href;

  const siblings = NAV_LEAVES.filter(
    (entry) => entry.parentLabel === leaf.parentLabel && entry.section === leaf.section,
  );
  return siblings.sort((a, b) => a.href.length - b.href.length)[0]?.href ?? leaf.href;
}

function tailFromPath(pathname: string, baseHref: string): WorkspaceBreadcrumbItem[] {
  if (pathname === baseHref) return [];

  const rest = pathname.slice(baseHref.length).replace(/^\//, '');
  if (!rest) return [];

  const segments = rest.split('/').filter(Boolean);
  const items: WorkspaceBreadcrumbItem[] = [];
  let pathAcc = baseHref;

  for (const segment of segments) {
    pathAcc += `/${segment}`;
    const isLast = segment === segments[segments.length - 1];
    const label = humanizeSegment(segment);
    if (isDynamicSegment(segment)) {
      items.push(crumb('…', isLast ? undefined : pathAcc));
    } else {
      items.push(crumb(label, isLast ? undefined : pathAcc));
    }
  }

  return items;
}

function buildFromNav(pathname: string, leaf: NavLeaf): WorkspaceBreadcrumbItem[] {
  const items: WorkspaceBreadcrumbItem[] = [];
  const moduleRoot = moduleHref(leaf);

  items.push(sectionCrumb(leaf.section, moduleRoot));

  if (leaf.parentLabel) {
    const onModuleRoot = pathname === moduleRoot;
    items.push(crumb(leaf.parentLabel, onModuleRoot ? undefined : moduleRoot));
    if (onModuleRoot) return items;

    const rest = pathname.slice(moduleRoot.length).replace(/^\//, '');
    const firstSeg = rest.split('/')[0] ?? '';
    const skipChildNav = leaf.href === moduleRoot && isDynamicSegment(firstSeg);

    if (!skipChildNav && (pathname === leaf.href || pathname.startsWith(`${leaf.href}/`))) {
      const onExactChild = pathname === leaf.href;
      if (leaf.label !== leaf.parentLabel) {
        items.push(crumb(leaf.label, onExactChild ? undefined : leaf.href));
      }
      if (onExactChild) return items;
      items.push(...tailFromPath(pathname, leaf.href));
      return items;
    }

    items.push(...tailFromPath(pathname, moduleRoot));
    return items;
  }

  const onRoot = pathname === leaf.href;
  items.push(crumb(leaf.label, onRoot ? undefined : leaf.href));
  if (!onRoot) {
    items.push(...tailFromPath(pathname, leaf.href));
  }
  return items;
}

function buildFallback(pathname: string): WorkspaceBreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) return [crumb('Accueil', '/dashboard')];

  const items: WorkspaceBreadcrumbItem[] = [];
  let pathAcc = '';

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]!;
    pathAcc += `/${segment}`;
    const isLast = i === segments.length - 1;
    items.push(crumb(humanizeSegment(segment), isLast ? undefined : pathAcc));
  }

  return items;
}

function dedupeConsecutive(items: WorkspaceBreadcrumbItem[]): WorkspaceBreadcrumbItem[] {
  return items.filter((item, index) => {
    if (index === 0) return true;
    const prev = items[index - 1];
    return prev?.label !== item.label || prev?.href !== item.href;
  });
}

function applyEntityLabel(
  items: WorkspaceBreadcrumbItem[],
  entityLabel?: string,
  entityHref?: string,
): WorkspaceBreadcrumbItem[] {
  if (!entityLabel?.trim()) return items;

  let replaced = false;
  return items.map((item) => {
    if (!replaced && item.label === '…') {
      replaced = true;
      return {
        label: entityLabel.trim(),
        href: entityHref ?? item.href,
      };
    }
    return item;
  });
}

/** Construit le fil d’Ariane workspace à partir du pathname. */
export function buildWorkspaceBreadcrumb(pathname: string): WorkspaceBreadcrumbItem[] {
  const normalized = pathname.split('?')[0]?.replace(/\/$/, '') || '/';
  if (normalized === '/account') {
    return [crumb('Compte')];
  }

  const leaf = findNavLeaf(normalized);
  const base = leaf ? buildFromNav(normalized, leaf) : buildFallback(normalized);
  return dedupeConsecutive(base);
}

export function resolveWorkspaceBreadcrumb(
  pathname: string,
  override?: WorkspaceBreadcrumbOverride | null,
): WorkspaceBreadcrumbItem[] {
  if (override?.items?.length) {
    return override.items;
  }

  const base = buildWorkspaceBreadcrumb(pathname);
  return applyEntityLabel(base, override?.entityLabel, override?.entityHref);
}
