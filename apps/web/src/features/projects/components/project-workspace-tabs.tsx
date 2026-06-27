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
  ListChecks,
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
  projectBudget,
  projectDetail,
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
  | 'options';

function tabLinkClass(active: boolean, presentation: 'default' | 'bar') {
  if (presentation === 'bar') {
    return cn(
      'starium-project-workspace-tab',
      active && 'starium-project-workspace-tab--active',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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

const barTabLabelClass = 'max-w-full truncate';

export type ProjectWorkspaceTabState = {
  isSheet: boolean;
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
  const isTasks = Boolean(pathname?.includes('/tasks'));
  const isRisks = Boolean(pathname?.includes('/risks'));
  const isPlanning = Boolean(pathname?.includes('/planning'));
  const isBudget = Boolean(pathname?.includes('/budget'));
  const isScenarios = Boolean(pathname?.includes('/scenarios'));
  const isOptions = Boolean(pathname?.includes('/options'));
  const isPoints = tab === 'points';
  const isSynth =
    !isSheet &&
    !isTasks &&
    !isRisks &&
    !isPoints &&
    !isPlanning &&
    !isBudget &&
    !isScenarios &&
    !isOptions;
  return {
    isSheet,
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
    <div className="starium-project-workspace-tabs-mobile max-md:block md:hidden">
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
          className="starium-project-workspace-tabs-mobile__trigger"
          aria-label="Choisir une section du projet"
        >
          <SelectValue>
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="starium-synthesis-icon-well starium-project-workspace-tabs-mobile__icon-well"
                aria-hidden
              >
                <ActiveIcon className="size-[18px] shrink-0" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span className="starium-project-workspace-tabs-mobile__eyebrow">
                  Section du projet
                </span>
                <span className="starium-project-workspace-tabs-mobile__value truncate">
                  {activeTab.label}
                </span>
              </span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" sideOffset={6}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <SelectItem
                key={tab.id}
                value={tab.id}
                className={cn(
                  'min-h-11 py-2.5 text-sm',
                  isActive && 'starium-project-workspace-tabs-mobile__item--active',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-md',
                      isActive
                        ? 'starium-synthesis-icon-well'
                        : 'bg-muted/60 text-muted-foreground',
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4 shrink-0" />
                  </span>
                  <span className="truncate">{tab.label}</span>
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
      <>
        <ProjectWorkspaceTabsMobileSelect tabs={tabs} activeTabId={activeTabId} />
        <nav
          className="starium-project-workspace-tabs relative z-0 hidden min-w-0 md:flex"
          role="tablist"
          aria-label="Navigation projet"
        >
          <WorkspaceTabLinks tabs={tabs} tabState={tabState} presentation="bar" />
        </nav>
      </>
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
