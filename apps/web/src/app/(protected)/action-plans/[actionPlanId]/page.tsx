'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PermissionGate } from '@/components/PermissionGate';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { ActionPlanTaskCreateDialog } from '@/features/projects/components/action-plan-task-create-dialog';
import { ActionPlanTaskEditDialog } from '@/features/projects/components/action-plan-task-edit-dialog';
import { useActionPlanDetailQuery } from '@/features/projects/hooks/use-action-plan-detail-query';
import { useActionPlanTasksQuery } from '@/features/projects/hooks/use-action-plan-tasks-query';
import { useProjectAssignableUsers } from '@/features/projects/hooks/use-project-assignable-users';
import { ArrowLeft, Plus } from 'lucide-react';

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function formatUser(
  id: string | null | undefined,
  users: { id: string; firstName: string | null; lastName: string | null; email: string }[],
): string {
  if (!id) return '—';
  const u = users.find((x) => x.id === id);
  if (!u) return '—';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function formatResourcePerson(r: {
  firstName: string | null;
  name: string;
  code: string | null;
}): string {
  const label = [r.firstName, r.name].filter(Boolean).join(' ').trim();
  return label || r.code || '—';
}

function formatTagsCell(tags: unknown): string {
  if (tags == null) return '—';
  if (Array.isArray(tags) && tags.every((x) => typeof x === 'string')) {
    return tags.length ? tags.join(', ') : '—';
  }
  return '—';
}

/** Base UI Select : sans `items`, le trigger affiche la valeur brute (ex. `__none`). */
const FILTER_STATUS_LABELS: Record<string, string> = {
  __all: 'Tous',
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
};

const FILTER_PRIORITY_LABELS: Record<string, string> = {
  __all: 'Toutes',
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

export default function ActionPlanDetailPage() {
  const params = useParams();
  const actionPlanId = typeof params.actionPlanId === 'string' ? params.actionPlanId : '';
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('projects.read');
  const canUpdateProjects = has('projects.update');
  const enabled = !!clientId && permsSuccess && canRead && !!actionPlanId;

  const planQuery = useActionPlanDetailQuery(actionPlanId, { enabled });
  const [statusF, setStatusF] = useState<string>('');
  const [priorityF, setPriorityF] = useState<string>('');
  const [searchF, setSearchF] = useState('');
  const tasksQuery = useActionPlanTasksQuery(
    actionPlanId,
    {
      status: statusF || undefined,
      priority: priorityF || undefined,
      search: searchF.trim() || undefined,
      limit: 100,
      offset: 0,
    },
    { enabled },
  );

  const assignable = useProjectAssignableUsers({ enabled });

  const users = assignable.data?.users ?? [];

  const [open, setOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const plan = planQuery.data;
  const progressLabel = plan ? `${plan.progressPercent}%` : '—';

  const detailTask = useMemo(() => {
    if (!selectedTaskId || !tasksQuery.data?.items) return null;
    return tasksQuery.data.items.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasksQuery.data?.items]);

  useEffect(() => {
    if (!selectedTaskId || !tasksQuery.isSuccess || !tasksQuery.data?.items) return;
    const found = tasksQuery.data.items.some((t) => t.id === selectedTaskId);
    if (!found) setSelectedTaskId(null);
  }, [selectedTaskId, tasksQuery.isSuccess, tasksQuery.data?.items]);

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="mb-4">
          <Link
            href="/action-plans"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Plans d’action
          </Link>
        </div>

        {planQuery.isLoading && <LoadingState rows={3} />}

        {planQuery.error && (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 text-sm text-destructive">
              Plan introuvable ou accès refusé.
            </CardContent>
          </Card>
        )}

        {plan && (
          <>
            <PageHeader
              title={plan.title}
              description={`${plan.code} · Avancement ${progressLabel} · ${plan.status}`}
              actions={
                <PermissionGate permission="projects.update">
                  <Button type="button" size="sm" onClick={() => setOpen(true)}>
                    <Plus className="size-4" />
                    Nouvelle tâche
                  </Button>
                </PermissionGate>
              }
            />

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="mb-1 text-xs font-medium text-muted-foreground">Progression du plan</div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, plan.progressPercent))}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Recherche</Label>
                <Input
                  className="w-[min(100%,280px)]"
                  placeholder="Nom de tâche…"
                  value={searchF}
                  onChange={(e) => setSearchF(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Statut tâche</Label>
                <Select
                  value={statusF || '__all'}
                  onValueChange={(v) => setStatusF(!v || v === '__all' ? '' : v)}
                  items={FILTER_STATUS_LABELS}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Tous</SelectItem>
                    <SelectItem value="TODO">À faire</SelectItem>
                    <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                    <SelectItem value="BLOCKED">Bloquée</SelectItem>
                    <SelectItem value="DONE">Terminée</SelectItem>
                    <SelectItem value="CANCELLED">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select
                  value={priorityF || '__all'}
                  onValueChange={(v) => setPriorityF(!v || v === '__all' ? '' : v)}
                  items={FILTER_PRIORITY_LABELS}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Toutes</SelectItem>
                    <SelectItem value="LOW">Basse</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Haute</SelectItem>
                    <SelectItem value="CRITICAL">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tasksQuery.isLoading && <LoadingState rows={5} />}

            {tasksQuery.data && tasksQuery.data.items.length === 0 && !tasksQuery.isLoading && (
              <EmptyState title="Aucune tâche" description="Ajoutez une tâche à ce plan." />
            )}

            {tasksQuery.data && tasksQuery.data.items.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tâche</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Projet</TableHead>
                      <TableHead>Risque</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Charge (h)</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasksQuery.data.items.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        tabIndex={0}
                        onClick={() => setSelectedTaskId(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTaskId(row.id);
                          }
                        }}
                      >
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.priority}</TableCell>
                        <TableCell>
                          {row.project ? `${row.project.code} — ${row.project.name}` : '—'}
                        </TableCell>
                        <TableCell>
                          {row.risk ? `${row.risk.code} — ${row.risk.title}` : '—'}
                        </TableCell>
                        <TableCell>{fmtShortDate(row.plannedStartDate)}</TableCell>
                        <TableCell>{fmtShortDate(row.plannedEndDate)}</TableCell>
                        <TableCell>
                          {row.estimatedHours != null && !Number.isNaN(Number(row.estimatedHours))
                            ? String(row.estimatedHours)
                            : '—'}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-muted-foreground">
                          {formatTagsCell(row.tags)}
                        </TableCell>
                        <TableCell>
                          {row.responsibleResource
                            ? formatResourcePerson(row.responsibleResource)
                            : formatUser(row.ownerUserId, users)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        <ActionPlanTaskEditDialog
          open={selectedTaskId !== null}
          onOpenChange={(o) => {
            if (!o) setSelectedTaskId(null);
          }}
          actionPlanId={actionPlanId}
          task={detailTask}
          canEdit={canUpdateProjects}
        />

        <ActionPlanTaskCreateDialog
          open={open}
          onOpenChange={setOpen}
          actionPlanId={actionPlanId}
          prefill={null}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
