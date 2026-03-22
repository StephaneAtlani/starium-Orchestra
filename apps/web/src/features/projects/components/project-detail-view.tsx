'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/loading-state';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import {
  PROJECT_KIND_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  RISK_STATUS_LABEL,
  MILESTONE_STATUS_LABEL,
  WARNING_CODE_LABEL,
} from '../constants/project-enum-labels';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { projectsList } from '../constants/project-routes';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, ChevronLeft, LayoutDashboard } from 'lucide-react';
import { ProjectBudgetSection } from './project-budget-section';
import { ProjectReviewsTab } from './project-reviews-tab';
import { ProjectWorkspaceTabs } from './project-workspace-tabs';
import type { ProjectDetail } from '../types/project.types';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function ProjectDetailTabbedContent({
  projectId,
  project,
  tasks,
  risks,
  milestones,
}: {
  projectId: string;
  project: ProjectDetail;
  tasks: ReturnType<typeof useProjectTasksQuery>;
  risks: ReturnType<typeof useProjectRisksQuery>;
  milestones: ReturnType<typeof useProjectMilestonesQuery>;
}) {
  const searchParams = useSearchParams();
  const showPoints = searchParams.get('tab') === 'points';

  return (
    <Card size="sm" className="min-w-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3.5 sm:px-5">
        <ProjectWorkspaceTabs projectId={projectId} />
      </CardHeader>
      <CardContent
        className={
          showPoints
            ? 'p-4 sm:p-6'
            : 'flex w-full min-w-0 flex-col gap-6 p-4 sm:p-6'
        }
      >
        {showPoints ? (
          <ProjectReviewsTab projectId={projectId} />
        ) : (
          <>
        <div className="grid gap-4 lg:grid-cols-3">
          <section
            className={cn(
              'min-w-0 rounded-xl border border-border/70 bg-card p-4 shadow-sm lg:col-span-2',
              'border-l-[3px] border-l-sky-500/70',
            )}
            aria-labelledby="project-detail-info-heading"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-sky-500/10 text-sky-800 shadow-inner dark:text-sky-300"
                aria-hidden
              >
                <LayoutDashboard className="size-4" />
              </div>
              <h2
                id="project-detail-info-heading"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Informations
              </h2>
            </div>
            <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <span className="text-muted-foreground">Nature : </span>
                  {PROJECT_KIND_LABEL[project.kind as keyof typeof PROJECT_KIND_LABEL] ??
                    project.kind}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Type : </span>
                  {PROJECT_TYPE_LABEL[project.type] ?? project.type}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Statut : </span>
                  {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Avancement manuel / dérivé : </span>
                  {project.progressPercent != null ? `${project.progressPercent} %` : '—'}
                  {' / '}
                  {project.derivedProgressPercent != null
                    ? `${project.derivedProgressPercent} %`
                    : '—'}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Échéance cible : </span>
                  {formatDate(project.targetEndDate)}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Responsable projet / activité : </span>
                  {project.ownerDisplayName ?? '—'}
                </div>
                {project.pilotNotes && (
                  <p className="sm:col-span-2 mt-1 whitespace-pre-wrap border-t pt-3 text-muted-foreground">
                    <span className="font-medium text-foreground">Notes pilotage : </span>
                    {project.pilotNotes}
                  </p>
                )}
                {project.targetBudgetAmount && (
                  <div className="sm:col-span-2 border-t pt-3">
                    <span className="text-muted-foreground">Budget cible : </span>
                    {project.targetBudgetAmount}
                  </div>
                )}
            </div>
          </section>

          <section
            className="min-w-0 rounded-lg border border-border bg-transparent px-3 py-2.5 lg:col-span-1"
            aria-labelledby="project-detail-kpi-heading"
          >
            <h2
              id="project-detail-kpi-heading"
              className="mb-2 border-b border-border/70 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Compteurs
            </h2>
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-2 sm:justify-end lg:flex-col lg:items-stretch lg:gap-3">
                <span
                  className="inline-flex items-baseline gap-1.5 tabular-nums"
                  title="Tâches ouvertes"
                >
                  <span className="text-lg font-semibold leading-none">
                    {project.openTasksCount}
                  </span>
                  <span className="text-xs text-muted-foreground">Tâches</span>
                </span>
                <span
                  className="inline-flex items-baseline gap-1.5 tabular-nums"
                  title="Risques ouverts"
                >
                  <span className="text-lg font-semibold leading-none">
                    {project.openRisksCount}
                  </span>
                  <span className="text-xs text-muted-foreground">Risques</span>
                </span>
                <span
                  className="inline-flex items-baseline gap-1.5 tabular-nums"
                  title="Jalons en retard"
                >
                  <span className="text-lg font-semibold leading-none">
                    {project.delayedMilestonesCount}
                  </span>
                  <span className="text-xs text-muted-foreground">Jalons ret.</span>
                </span>
              </div>
          </section>
        </div>

        <ProjectBudgetSection projectId={projectId} />

        <Card size="sm" className="overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-medium">Tâches</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tasks.isLoading ? (
              <div className="p-4">
                <LoadingState rows={2} />
              </div>
            ) : !tasks.data?.items?.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune tâche.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Fin planifiée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.data.items.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{TASK_STATUS_LABEL[t.status] ?? t.status}</TableCell>
                      <TableCell>
                        {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                      </TableCell>
                      <TableCell>{formatDate(t.plannedEndDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-medium">Risques</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {risks.isLoading ? (
              <div className="p-4">
                <LoadingState rows={2} />
              </div>
            ) : !risks.data?.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun risque.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Criticité (calc.)</TableHead>
                    <TableHead>P / I</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.data.map((r) => {
                    const crit = riskCriticalityForRisk(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.title}</TableCell>
                        <TableCell>{RISK_STATUS_LABEL[r.status] ?? r.status}</TableCell>
                        <TableCell>{crit}</TableCell>
                        <TableCell className="text-xs">
                          {r.probability} / {r.impact}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-medium">Jalons</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {milestones.isLoading ? (
              <div className="p-4">
                <LoadingState rows={2} />
              </div>
            ) : !milestones.data?.items?.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun jalon.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date cible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.data.items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell>{MILESTONE_STATUS_LABEL[m.status] ?? m.status}</TableCell>
                      <TableCell>{formatDate(m.targetDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const { data: project, isLoading, error } = useProjectDetailQuery(projectId);
  const tasks = useProjectTasksQuery(projectId);
  const risks = useProjectRisksQuery(projectId);
  const milestones = useProjectMilestonesQuery(projectId);

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  if (isLoading) {
    return <LoadingState rows={6} />;
  }

  if (error || !project) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle aria-hidden />
        <AlertTitle>Projet introuvable</AlertTitle>
        <AlertDescription>
          Vous n’avez pas accès à ce projet ou il n’existe plus.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-5">
        <div className="space-y-3">
          <Link
            href={projectsList()}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              '-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground',
            )}
          >
            <ChevronLeft className="size-4" />
            Portefeuille projets
          </Link>
          <PageHeader
            title={project.name}
            description={project.code ? `Code : ${project.code}` : undefined}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <HealthBadge health={project.computedHealth} />
              </div>
            }
          />
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Signaux portefeuille</p>
          <div className="flex flex-wrap gap-2">
            <ProjectPortfolioBadges signals={project.signals} />
          </div>
        </div>

        {project.warnings.length > 0 && (
          <Alert
            className="border-amber-500/35 bg-amber-500/5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-600"
            role="status"
          >
            <AlertTriangle className="text-amber-800 dark:text-amber-600" aria-hidden />
            <AlertTitle className="font-semibold text-amber-950 dark:text-amber-600">
              Alertes projet
            </AlertTitle>
            <AlertDescription className="text-amber-950/95 dark:text-amber-600/95">
              {project.warnings.map((w) => WARNING_CODE_LABEL[w] ?? w).join(' · ')}
            </AlertDescription>
          </Alert>
        )}
      </header>

      <Suspense
        fallback={
          <Card size="sm" className="min-w-0 overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3.5 sm:px-5">
              <LoadingState rows={1} />
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <LoadingState rows={6} />
            </CardContent>
          </Card>
        }
      >
        <ProjectDetailTabbedContent
          projectId={projectId}
          project={project}
          tasks={tasks}
          risks={risks}
          milestones={milestones}
        />
      </Suspense>
    </>
  );
}
