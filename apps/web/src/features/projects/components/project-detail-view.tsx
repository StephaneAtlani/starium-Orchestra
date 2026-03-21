'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
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
  RISK_STATUS_LABEL,
  MILESTONE_STATUS_LABEL,
  WARNING_CODE_LABEL,
} from '../constants/project-enum-labels';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { projectSheet, projectsList } from '../constants/project-routes';
import { ChevronLeft, LayoutDashboard } from 'lucide-react';
import { ProjectBudgetSection } from './project-budget-section';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
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
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Projet introuvable ou accès refusé.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={projectsList()}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Portefeuille projets
        </Link>
        <PageHeader
          title={project.name}
          description={project.code ? `Code : ${project.code}` : undefined}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={projectSheet(projectId)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <LayoutDashboard className="size-4" />
                Fiche projet
              </Link>
              <HealthBadge health={project.computedHealth} />
            </div>
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <ProjectPortfolioBadges signals={project.signals} />
      </div>

      {project.warnings.length > 0 && (
        <div className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-[#1c1917] dark:border-amber-400/40 dark:bg-amber-100/90">
          <span className="font-medium">Alertes : </span>
          {project.warnings.map((w) => WARNING_CODE_LABEL[w] ?? w).join(' · ')}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm" className="lg:col-span-2 w-full min-w-0">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
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
          </CardContent>
        </Card>

        <Card
          size="sm"
          className="lg:col-span-2 w-full min-w-0 gap-0 py-0 data-[size=sm]:gap-0 data-[size=sm]:py-0"
        >
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-2 !pt-2 !pb-2 sm:gap-x-10 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:!py-2">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Compteurs
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-start gap-x-6 gap-y-1 sm:justify-end">
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
          </CardContent>
        </Card>
      </div>

      <ProjectBudgetSection projectId={projectId} />

      <Card size="sm">
        <CardHeader>
          <CardTitle>Tâches</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.isLoading ? (
            <LoadingState rows={2} />
          ) : !tasks.data?.length ? (
            <p className="text-sm text-muted-foreground">Aucune tâche.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{TASK_STATUS_LABEL[t.status] ?? t.status}</TableCell>
                    <TableCell>{t.priority}</TableCell>
                    <TableCell>{formatDate(t.dueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Risques</CardTitle>
        </CardHeader>
        <CardContent>
          {risks.isLoading ? (
            <LoadingState rows={2} />
          ) : !risks.data?.length ? (
            <p className="text-sm text-muted-foreground">Aucun risque.</p>
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

      <Card size="sm">
        <CardHeader>
          <CardTitle>Jalons</CardTitle>
        </CardHeader>
        <CardContent>
          {milestones.isLoading ? (
            <LoadingState rows={2} />
          ) : !milestones.data?.length ? (
            <p className="text-sm text-muted-foreground">Aucun jalon.</p>
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
                {milestones.data.map((m) => (
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
    </div>
  );
}
