'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, type ComponentType } from 'react';
import {
  Banknote,
  CalendarRange,
  ClipboardList,
  LayoutGrid,
  Layers3,
  ListTodo,
  Lock,
  Settings,
  Split,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  projectDetail,
  projectPlanning,
  projectScenarios,
  projectProjectOptions,
  projectSheet,
  projectRisks,
} from '../constants/project-routes';

export type WorkspaceTabId =
  | 'synth'
  | 'sheet'
  | 'planning'
  | 'risks'
  | 'budget'
  | 'points'
  | 'scenarios'
  | 'options';

function tabLinkClass(active: boolean, presentation: 'default' | 'bar') {
  if (presentation === 'bar') {
    return cn(
      'relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center transition-colors',
      'md:flex-row md:gap-1.5 md:px-2.5 md:py-3 md:text-left lg:px-3',
      'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'after:absolute after:inset-x-0.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:transition-opacity md:after:inset-x-1',
      active
        ? 'font-semibold text-[color:var(--brand-gold-700)] after:opacity-100'
        : 'text-muted-foreground after:opacity-0',
      '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      active ? '[&_svg]:text-[color:var(--brand-gold-700)]' : '[&_svg]:text-muted-foreground',
    );
  }

  return cn(
    'group relative inline-flex h-[calc(100%-1px)] min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap transition-all',
    'hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4',
    active
      ? 'bg-background font-semibold text-foreground shadow-sm [&_svg]:opacity-100'
      : 'text-foreground/60 [&_svg]:opacity-70',
  );
}

const tablistClassNameDefault =
  'grid h-11 min-w-[min(100%,22rem)] grid-cols-2 gap-1 rounded-xl bg-muted/90 p-1 shadow-inner ring-1 ring-border/40 sm:min-w-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7';

const barTabLabelClass = 'max-w-full truncate text-xs font-medium leading-tight lg:text-sm';

const tablistClassNameBar = 'hidden w-full grid-cols-8 border-b border-border/60 md:grid';

export type ProjectWorkspaceTabState = {
  isSheet: boolean;
  isRisks: boolean;
  isPlanning: boolean;
  isScenarios: boolean;
  isOptions: boolean;
  isPoints: boolean;
  isSynth: boolean;
};

export function deriveProjectWorkspaceTabState(
  pathname: string | null | undefined,
  tab: string | null,
): ProjectWorkspaceTabState {
  const isSheet = Boolean(pathname?.includes('/sheet'));
  const isRisks = Boolean(pathname?.includes('/risks'));
  const isPlanning = Boolean(pathname?.includes('/planning'));
  const isScenarios = Boolean(pathname?.includes('/scenarios'));
  const isOptions = Boolean(pathname?.includes('/options'));
  const isPoints = tab === 'points';
  const isSynth = !isSheet && !isRisks && !isPoints && !isPlanning && !isScenarios && !isOptions;
  return { isSheet, isRisks, isPlanning, isScenarios, isOptions, isPoints, isSynth };
}

export function getActiveWorkspaceTabId(tabState: ProjectWorkspaceTabState): WorkspaceTabId {
  if (tabState.isSheet) return 'sheet';
  if (tabState.isPlanning) return 'planning';
  if (tabState.isRisks) return 'risks';
  if (tabState.isPoints) return 'points';
  if (tabState.isScenarios) return 'scenarios';
  if (tabState.isOptions) return 'options';
  return 'synth';
}

type WorkspaceTabDef = {
  id: WorkspaceTabId;
  label: string;
  href: string;
  ariaLabel?: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (tabState: ProjectWorkspaceTabState) => boolean;
};

function buildWorkspaceTabs(
  projectId: string,
  detailHref: string,
  scenariosReadOnly: boolean,
): WorkspaceTabDef[] {
  const pointsHref = `${detailHref}?tab=points`;
  const ScenariosIcon = scenariosReadOnly ? Lock : Split;

  return [
    {
      id: 'synth',
      label: 'Aperçu',
      href: detailHref,
      icon: LayoutGrid,
      isActive: (s) => s.isSynth,
    },
    {
      id: 'sheet',
      label: 'Fiche projet',
      href: projectSheet(projectId),
      icon: Layers3,
      isActive: (s) => s.isSheet,
    },
    {
      id: 'planning',
      label: 'Planning',
      href: projectPlanning(projectId),
      icon: CalendarRange,
      isActive: (s) => s.isPlanning,
    },
    {
      id: 'risks',
      label: 'Risques',
      href: projectRisks(projectId),
      icon: ListTodo,
      isActive: (s) => s.isRisks,
    },
    {
      id: 'budget',
      label: 'Budget',
      href: `${detailHref}#project-budget`,
      icon: Banknote,
      isActive: () => false,
    },
    {
      id: 'points',
      label: 'Points projet',
      href: pointsHref,
      icon: ClipboardList,
      isActive: (s) => s.isPoints,
    },
    {
      id: 'scenarios',
      label: scenariosReadOnly ? 'Scénarios (lecture seule)' : 'Scénarios',
      ariaLabel: scenariosReadOnly ? 'Scénarios, lecture seule' : 'Scénarios',
      href: projectScenarios(projectId),
      icon: ScenariosIcon,
      isActive: (s) => s.isScenarios,
    },
    {
      id: 'options',
      label: 'Options',
      href: projectProjectOptions(projectId),
      icon: Settings,
      isActive: (s) => s.isOptions,
    },
  ];
}

function WorkspaceTabLinks({
  tabs,
  tabState,
  presentation,
}: {
  tabs: WorkspaceTabDef[];
  tabState: ProjectWorkspaceTabState;
  presentation: 'default' | 'bar';
}) {
  return (
    <>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.isActive(tabState);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-current={active ? 'page' : undefined}
            aria-label={tab.ariaLabel ?? tab.label}
            className={tabLinkClass(active, presentation)}
          >
            <Icon className="shrink-0" aria-hidden />
            <span className={barTabLabelClass}>{tab.label}</span>
          </Link>
        );
      })}
    </>
  );
}

function ProjectWorkspaceTabsMobileSelect({
  tabs,
  activeTabId,
}: {
  tabs: WorkspaceTabDef[];
  activeTabId: WorkspaceTabId;
}) {
  const router = useRouter();
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const ActiveIcon = activeTab.icon;

  return (
    <div className="border-b border-border/60 p-3 md:hidden">
      <Label htmlFor="project-workspace-tab-select" className="sr-only">
        Section du projet
      </Label>
      <Select
        value={activeTabId}
        onValueChange={(value) => {
          if (!value) return;
          const next = tabs.find((t) => t.id === value);
          if (next) router.push(next.href);
        }}
      >
        <SelectTrigger
          id="project-workspace-tab-select"
          className="h-11 w-full min-h-11 text-base"
          aria-label="Choisir une section du projet"
        >
          <SelectValue>
            <span className="flex items-center gap-2">
              <ActiveIcon className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{activeTab.label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <SelectItem key={tab.id} value={tab.id} className="min-h-11 text-base">
                <span className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                  {tab.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Navigation principale projet.
 * `presentation="bar"` — bandeau blanc : liste déroulante mobile, onglets soulignés desktop.
 * `presentation="default"` — grille chips dans un CardHeader (autres écrans projet).
 */
export function ProjectWorkspaceTabs({
  projectId,
  projectStatus,
  presentation = 'default',
}: {
  projectId: string;
  projectStatus?: string;
  presentation?: 'default' | 'bar';
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabState = deriveProjectWorkspaceTabState(pathname, searchParams.get('tab'));
  const activeTabId = getActiveWorkspaceTabId(tabState);

  const detailHref = projectDetail(projectId);
  const scenariosReadOnly =
    projectStatus !== undefined && projectStatus !== 'DRAFT';

  const tabs = useMemo(
    () => buildWorkspaceTabs(projectId, detailHref, scenariosReadOnly),
    [projectId, detailHref, scenariosReadOnly],
  );

  if (presentation === 'bar') {
    return (
      <nav
        className="starium-panel overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        aria-label="Navigation projet"
      >
        <ProjectWorkspaceTabsMobileSelect tabs={tabs} activeTabId={activeTabId} />
        <div role="tablist" className={tablistClassNameBar}>
          <WorkspaceTabLinks tabs={tabs} tabState={tabState} presentation="bar" />
        </div>
      </nav>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <div role="tablist" aria-label="Navigation projet" className={tablistClassNameDefault}>
        <WorkspaceTabLinks tabs={tabs} tabState={tabState} presentation="default" />
      </div>
    </div>
  );
}
