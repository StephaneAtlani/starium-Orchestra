'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, type ComponentType } from 'react';
import {
  Banknote,
  CalendarRange,
  ClipboardList,
  History,
  LayoutGrid,
  Layers3,
  ListChecks,
  ListTodo,
  Lock,
  Settings,
  Split,
} from 'lucide-react';
import {
  WorkspaceTabBar,
  type WorkspaceTabBarItem,
} from '@/components/layout/workspace-tab-bar';
import { cn } from '@/lib/utils';
import {
  projectBudget,
  projectDetail,
  projectHistory,
  projectPlanning,
  projectTasks,
  projectScenarios,
  projectProjectOptions,
  projectSheet,
  projectRisks,
} from '../constants/project-routes';

export type WorkspaceTabId =
  | 'synth'
  | 'sheet'
  | 'tasks'
  | 'planning'
  | 'risks'
  | 'budget'
  | 'points'
  | 'scenarios'
  | 'history'
  | 'options';

function tabLinkClass(active: boolean) {
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

const barTabLabelClass = 'max-w-full truncate';

export type ProjectWorkspaceTabState = {
  isSheet: boolean;
  isHistory: boolean;
  isTasks: boolean;
  isRisks: boolean;
  isPlanning: boolean;
  isBudget: boolean;
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
  const isHistory = Boolean(pathname?.includes('/history'));
  const isTasks = Boolean(pathname?.includes('/tasks'));
  const isRisks = Boolean(pathname?.includes('/risks'));
  const isPlanning = Boolean(pathname?.includes('/planning'));
  const isBudget = Boolean(pathname?.includes('/budget'));
  const isScenarios = Boolean(pathname?.includes('/scenarios'));
  const isOptions = Boolean(pathname?.includes('/options'));
  const isPoints = tab === 'points';
  const isSynth =
    !isSheet &&
    !isHistory &&
    !isTasks &&
    !isRisks &&
    !isPoints &&
    !isPlanning &&
    !isBudget &&
    !isScenarios &&
    !isOptions;
  return {
    isSheet,
    isHistory,
    isTasks,
    isRisks,
    isPlanning,
    isBudget,
    isScenarios,
    isOptions,
    isPoints,
    isSynth,
  };
}

export function getActiveWorkspaceTabId(tabState: ProjectWorkspaceTabState): WorkspaceTabId {
  if (tabState.isSheet) return 'sheet';
  if (tabState.isTasks) return 'tasks';
  if (tabState.isPlanning) return 'planning';
  if (tabState.isRisks) return 'risks';
  if (tabState.isBudget) return 'budget';
  if (tabState.isPoints) return 'points';
  if (tabState.isScenarios) return 'scenarios';
  if (tabState.isHistory) return 'history';
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
      id: 'tasks',
      label: 'Tâches',
      href: projectTasks(projectId),
      icon: ListChecks,
      isActive: (s) => s.isTasks,
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
      href: projectBudget(projectId),
      icon: Banknote,
      isActive: (s) => s.isBudget,
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
      id: 'history',
      label: 'Historique',
      href: projectHistory(projectId),
      icon: History,
      isActive: (s) => s.isHistory,
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
}: {
  tabs: WorkspaceTabDef[];
  tabState: ProjectWorkspaceTabState;
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
            className={tabLinkClass(active)}
          >
            <Icon className="shrink-0" aria-hidden />
            <span className={barTabLabelClass}>{tab.label}</span>
          </Link>
        );
      })}
    </>
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
  const router = useRouter();
  const tabState = deriveProjectWorkspaceTabState(pathname, searchParams.get('tab'));
  const activeTabId = getActiveWorkspaceTabId(tabState);

  const detailHref = projectDetail(projectId);
  const scenariosReadOnly =
    projectStatus !== undefined && projectStatus !== 'DRAFT';

  const tabs = useMemo(
    () => buildWorkspaceTabs(projectId, detailHref, scenariosReadOnly),
    [projectId, detailHref, scenariosReadOnly],
  );

  const barItems = useMemo<WorkspaceTabBarItem[]>(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        ariaLabel: tab.ariaLabel,
        href: tab.href,
      })),
    [tabs],
  );

  if (presentation === 'bar') {
    return (
      <WorkspaceTabBar
        items={barItems}
        activeId={activeTabId}
        onSelect={(id) => {
          const next = tabs.find((tab) => tab.id === id);
          if (next) router.push(next.href);
        }}
        ariaLabel="Navigation projet"
        mobileEyebrow="Section du projet"
        selectId="project-workspace-tab-select"
        mobileAriaLabel="Choisir une section du projet"
      />
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <div role="tablist" aria-label="Navigation projet" className={tablistClassNameDefault}>
        <WorkspaceTabLinks tabs={tabs} tabState={tabState} />
      </div>
    </div>
  );
}
