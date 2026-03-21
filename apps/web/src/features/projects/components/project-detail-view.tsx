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
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  TASK_STATUS_LABEL,
  RISK_STATUS_LABEL,
  MILESTONE_STATUS_LABEL,
  WARNING_CODE_LABEL,
} from '../constants/project-enum-labels';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { projectsList } from '../constants/project-routes';
import { ChevronLeft } from 'lucide-react';

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
          actions={<HealthBadge health={project.computedHealth} />}
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
        <Card size="sm">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Type : </span>
              {PROJECT_TYPE_LABEL[project.type] ?? project.type}
            </div>
            <div>
              <span className="text-muted-foreground">Statut : </span>
              {PROJECT_STATUS_LABEL[project.status] ?? project.status}
            </div>
            <div>
              <span className="text-muted-foreground">Avancement manuel / dérivé : </span>
              {project.progressPercent != null ? `${project.progressPercent} %` : '—'}
              {' / '}
              {project.derivedProgressPercent != null
                ? `${project.derivedProgressPercent} %`
                : '—'}
            </div>
            <div>
              <span className="text-muted-foreground">Échéance cible : </span>
              {formatDate(project.targetEndDate)}
            </div>
            <div>
              <span className="text-muted-foreground">Responsable : </span>
              {project.ownerDisplayName ?? '—'}
            </div>
            {project.description && (
              <p className="mt-2 whitespace-pre-wrap border-t pt-2">{project.description}</p>
            )}
            {project.pilotNotes && (
              <p className="mt-2 whitespace-pre-wrap border-t pt-2 text-muted-foreground">
                <span className="font-medium text-foreground">Notes pilotage : </span>
                {project.pilotNotes}
              </p>
            )}
            {project.targetBudgetAmount && (
              <div className="border-t pt-2">
                <span className="text-muted-foreground">Budget cible : </span>
                {project.targetBudgetAmount}
              </div>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Compteurs</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{project.openTasksCount}</p>
              <p className="text-xs text-muted-foreground">Tâches ouvertes</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{project.openRisksCount}</p>
              <p className="text-xs text-muted-foreground">Risques ouverts</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{project.delayedMilestonesCount}</p>
              <p className="text-xs text-muted-foreground">Jalons retard</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
