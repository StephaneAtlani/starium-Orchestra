'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { createActionPlanTask } from '@/features/projects/api/action-plans.api';
import { listClientRisks, listProjects } from '@/features/projects/api/projects.api';
import { useActionPlanDetailQuery } from '@/features/projects/hooks/use-action-plan-detail-query';
import { useActionPlanTasksQuery } from '@/features/projects/hooks/use-action-plan-tasks-query';
import { useProjectAssignableUsers } from '@/features/projects/hooks/use-project-assignable-users';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
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

export default function ActionPlanDetailPage() {
  const params = useParams();
  const actionPlanId = typeof params.actionPlanId === 'string' ? params.actionPlanId : '';
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('projects.read');
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

  const authFetch = useAuthenticatedFetch();
  const assignable = useProjectAssignableUsers({ enabled });

  const projectsMini = useQuery({
    queryKey: [...projectQueryKeys.all, 'action-plan-project-pick', clientId],
    queryFn: () => listProjects(authFetch, { page: 1, limit: 200 }),
    enabled: !!clientId && enabled,
  });

  const risksMini = useQuery({
    queryKey: projectQueryKeys.clientRisks(clientId),
    queryFn: () => listClientRisks(authFetch),
    enabled: !!clientId && enabled,
  });

  const users = assignable.data?.users ?? [];

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tName, setTName] = useState('');
  const [tStatus, setTStatus] = useState('TODO');
  const [tPriority, setTPriority] = useState('MEDIUM');
  const [tProjectId, setTProjectId] = useState<string>('');
  const [tRiskId, setTRiskId] = useState<string>('');
  const [tOwner, setTOwner] = useState<string>('');

  const queryClient = useQueryClient();

  async function onCreateTask() {
    if (!tName.trim()) return;
    setCreating(true);
    try {
      await createActionPlanTask(authFetch, actionPlanId, {
        name: tName.trim(),
        status: tStatus,
        priority: tPriority,
        ownerUserId: tOwner || null,
        projectId: tProjectId || null,
        riskId: tRiskId || null,
      });
      await queryClient.invalidateQueries({
        queryKey: [...projectQueryKeys.all, 'action-plan-tasks', clientId, actionPlanId],
      });
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.actionPlanDetail(clientId, actionPlanId),
      });
      setOpen(false);
      setTName('');
      setTStatus('TODO');
      setTPriority('MEDIUM');
      setTProjectId('');
      setTRiskId('');
      setTOwner('');
    } finally {
      setCreating(false);
    }
  }

  const plan = planQuery.data;
  const progressLabel = plan ? `${plan.progressPercent}%` : '—';

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
                      <TableHead>Échéance</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasksQuery.data.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.priority}</TableCell>
                        <TableCell>
                          {row.project ? `${row.project.code} — ${row.project.name}` : '—'}
                        </TableCell>
                        <TableCell>
                          {row.risk ? `${row.risk.code} — ${row.risk.title}` : '—'}
                        </TableCell>
                        <TableCell>{fmtShortDate(row.plannedEndDate)}</TableCell>
                        <TableCell>{formatUser(row.ownerUserId, users)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle tâche dans le plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="nt-name">Intitulé</Label>
                <Input
                  id="nt-name"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="Nom de la tâche"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select value={tStatus} onValueChange={(v) => setTStatus(v ?? 'TODO')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Select value={tPriority} onValueChange={(v) => setTPriority(v ?? 'MEDIUM')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Basse</SelectItem>
                      <SelectItem value="MEDIUM">Moyenne</SelectItem>
                      <SelectItem value="HIGH">Haute</SelectItem>
                      <SelectItem value="CRITICAL">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Projet (optionnel)</Label>
                <Select
                  value={tProjectId || '__none'}
                  onValueChange={(v) => setTProjectId(!v || v === '__none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucun</SelectItem>
                    {(projectsMini.data?.items ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Risque (optionnel)</Label>
                <Select
                  value={tRiskId || '__none'}
                  onValueChange={(v) => setTRiskId(!v || v === '__none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucun</SelectItem>
                    {(risksMini.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.code} — {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Responsable (optionnel)</Label>
                <Select
                  value={tOwner || '__none'}
                  onValueChange={(v) => setTOwner(!v || v === '__none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                disabled={creating || !tName.trim()}
                onClick={() => void onCreateTask()}
              >
                {creating ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </RequireActiveClient>
  );
}
