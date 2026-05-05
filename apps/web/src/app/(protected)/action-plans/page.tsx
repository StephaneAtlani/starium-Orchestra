'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { PermissionGate } from '@/components/PermissionGate';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { createActionPlan } from '@/features/projects/api/action-plans.api';
import { useActionPlansListQuery } from '@/features/projects/hooks/use-action-plans-list-query';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import { ChevronRight, Plus } from 'lucide-react';

/** Code métier unique : dérivé du titre (sans accents), préfixe PA-. */
function suggestActionPlanCodeFromTitle(title: string): string {
  const raw = title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  if (raw.length >= 2) {
    return `PA-${raw}`;
  }
  return `PA-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export default function ActionPlansListPage() {
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('projects.read');
  const listEnabled = !!clientId && permsSuccess && canRead;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const { data, isLoading, error, refetch } = useActionPlansListQuery(
    { search: search.trim() || undefined, limit: 50, offset: 0 },
    { enabled: listEnabled },
  );
  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false;
      if (ownerFilter === 'assigned' && !p.ownerUserId) return false;
      if (ownerFilter === 'unassigned' && p.ownerUserId) return false;
      return true;
    });
  }, [data?.items, ownerFilter, priorityFilter, statusFilter]);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  /** Tant que true, le code est recalculé quand le titre change. */
  const [codeFollowsTitle, setCodeFollowsTitle] = useState(true);
  const [formStatus, setFormStatus] = useState('DRAFT');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all' || ownerFilter !== 'all';

  function resetCreateForm() {
    setFormTitle('');
    setFormCode('');
    setCodeFollowsTitle(true);
    setFormStatus('DRAFT');
    setFormPriority('MEDIUM');
  }

  function openCreateDialog() {
    resetCreateForm();
    setOpen(true);
  }

  function onTitleChange(value: string) {
    setFormTitle(value);
    if (codeFollowsTitle) {
      const t = value.trim();
      setFormCode(t ? suggestActionPlanCodeFromTitle(t) : '');
    }
  }

  function onCodeChange(value: string) {
    setCodeFollowsTitle(false);
    setFormCode(value);
  }

  async function onCreate() {
    const title = formTitle.trim();
    if (!title) return;
    const code = (formCode.trim() || suggestActionPlanCodeFromTitle(title)).toUpperCase();
    setCreating(true);
    try {
      await createActionPlan(authFetch, {
        title,
        code,
        status: formStatus,
        priority: formPriority,
      });
      await queryClient.invalidateQueries({
        queryKey: [...projectQueryKeys.all, 'action-plans', clientId],
      });
      setOpen(false);
      resetCreateForm();
    } finally {
      setCreating(false);
    }
  }

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Plans d’action"
          description="Cockpit d’exécution — tâches regroupées par plan (RFC-PLA-001)."
          actions={
            <PermissionGate permission="projects.update">
              <Button type="button" size="sm" onClick={() => openCreateDialog()}>
                <Plus className="size-4" />
                Nouveau plan
              </Button>
            </PermissionGate>
          }
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ap-search">Recherche</Label>
            <Input
              id="ap-search"
              className="w-[min(100%,320px)]"
              placeholder="Titre ou code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="ON_HOLD">En pause</SelectItem>
                <SelectItem value="COMPLETED">Terminé</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priorité</Label>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? 'all')}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Toutes les priorités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les priorités</SelectItem>
                <SelectItem value="LOW">Basse</SelectItem>
                <SelectItem value="MEDIUM">Moyenne</SelectItem>
                <SelectItem value="HIGH">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Responsable</Label>
            <Select value={ownerFilter} onValueChange={(v) => setOwnerFilter(v ?? 'all')}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="assigned">Assigné</SelectItem>
                <SelectItem value="unassigned">Non assigné</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasFilters}
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setOwnerFilter('all');
            }}
          >
            Réinitialiser filtres
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>
            Actualiser
          </Button>
        </div>

        {listEnabled && isLoading && <LoadingState rows={4} />}

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 text-sm text-destructive">
              Impossible de charger les plans.
            </CardContent>
          </Card>
        )}

        {data && filteredItems.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {filteredItems.length} plan{filteredItems.length > 1 ? 's' : ''} affiché
            {filteredItems.length > 1 ? 's' : ''}
            {data.items.length !== filteredItems.length ? ` sur ${data.items.length}` : ''}
          </p>
        )}

        {data && filteredItems.length === 0 && !isLoading && (
          <EmptyState
            title="Aucun plan d’action"
            description={
              data.items.length > 0
                ? 'Aucun plan ne correspond aux filtres sélectionnés.'
                : 'Créez un plan pour regrouper des tâches de pilotage.'
            }
          />
        )}

        {data && filteredItems.length > 0 && (
          <ul className="space-y-2">
            {filteredItems.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/action-plans/${p.id}`}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:bg-muted/30',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{p.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {p.code} · {p.status} · {p.progressPercent}% avancement
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              resetCreateForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau plan d’action</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="ap-titre">Titre</Label>
                <Input
                  id="ap-titre"
                  value={formTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Ex. Plan conformité Q2"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap-code">Code</Label>
                <Input
                  id="ap-code"
                  value={formCode}
                  onChange={(e) => onCodeChange(e.target.value)}
                  placeholder="Rempli automatiquement depuis le titre"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Généré à partir du titre (préfixe PA-) ; vous pouvez le modifier.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(v) => setFormStatus(v ?? 'DRAFT')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Brouillon</SelectItem>
                      <SelectItem value="ACTIVE">Actif</SelectItem>
                      <SelectItem value="ON_HOLD">En pause</SelectItem>
                      <SelectItem value="COMPLETED">Terminé</SelectItem>
                      <SelectItem value="CANCELLED">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priorité</Label>
                  <Select
                    value={formPriority}
                    onValueChange={(v) => setFormPriority(v ?? 'MEDIUM')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Basse</SelectItem>
                      <SelectItem value="MEDIUM">Moyenne</SelectItem>
                      <SelectItem value="HIGH">Haute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                disabled={creating || !formTitle.trim()}
                onClick={() => void onCreate()}
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
