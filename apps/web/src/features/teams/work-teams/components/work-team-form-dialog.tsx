'use client';

import { useLayoutEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OwnerOrgUnitSelect } from '@/features/organization/components/owner-org-unit-select';
import { useCreateWorkTeam, useUpdateWorkTeam } from '../hooks/use-work-team-mutations';
import { useWorkTeamsList } from '../hooks/use-work-teams-list';
import type { WorkTeamDto } from '../types/work-team.types';
import { WorkTeamLeadCombobox } from './work-team-lead-combobox';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  team?: WorkTeamDto | null;
  defaultParentId?: string | null;
};

export function WorkTeamFormDialog({
  open,
  onOpenChange,
  mode,
  team,
  defaultParentId,
}: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [orgUnitId, setOrgUnitId] = useState<string | null>(null);
  const [leadResourceId, setLeadResourceId] = useState<string>('');

  const parentsQuery = useWorkTeamsList(
    { limit: 500, offset: 0, includeArchived: true },
    { enabled: open },
  );
  const parentOptions = useMemo(() => {
    const items = parentsQuery.data?.items ?? [];
    if (mode === 'edit' && team) {
      return items.filter((t) => t.id !== team.id);
    }
    return items;
  }, [parentsQuery.data?.items, mode, team]);

  const createMutation = useCreateWorkTeam();
  const updateMutation = useUpdateWorkTeam(team?.id ?? '');

  useLayoutEffect(() => {
    if (!open) return;
    if (mode === 'edit' && team) {
      setName(team.name);
      setCode(team.code ?? '');
      setParentId(team.parentId ?? '');
      setOrgUnitId(team.orgUnitId ?? null);
      setLeadResourceId(team.leadResourceId ?? '');
    } else {
      setName('');
      setCode('');
      setParentId(defaultParentId ?? '');
      setOrgUnitId(null);
      setLeadResourceId('');
    }
  }, [open, mode, team, defaultParentId]);

  const busy = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Le nom est obligatoire');
      return;
    }
    try {
      if (mode === 'create') {
        if (!leadResourceId) {
          toast.error('Choisissez un responsable d’équipe (catalogue Humaine)');
          return;
        }
        await createMutation.mutateAsync({
          name: trimmed,
          code: code.trim() || null,
          parentId: parentId ? parentId : null,
          orgUnitId,
          leadResourceId,
        });
        toast.success('Équipe créée');
      } else if (team) {
        if (team.status === 'ACTIVE' && !leadResourceId) {
          toast.error('Une équipe active doit avoir un responsable (catalogue Humaine)');
          return;
        }
        await updateMutation.mutateAsync({
          name: trimmed,
          code: code.trim() || null,
          parentId: parentId ? parentId : null,
          orgUnitId,
          leadResourceId: leadResourceId ? leadResourceId : null,
        });
        toast.success('Équipe mise à jour');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const formId = 'work-team-form';

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nouvelle équipe organisationnelle' : 'Modifier l’équipe'}
      description="Équipe métier Starium (distincte de Microsoft Teams). Hiérarchie et rattachements ressources Humaines."
      size="lg"
      contentClassName="sm:max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form={formId} disabled={busy}>
            {mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </>
      }
    >
        <form id={formId} onSubmit={onSubmit}>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wt-name">Nom</Label>
              <Input
                id="wt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wt-code">Code métier (optionnel)</Label>
              <Input
                id="wt-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={busy}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wt-parent">Équipe parente</Label>
              <select
                id="wt-parent"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={busy || parentsQuery.isLoading}
              >
                <option value="">Racine (aucun parent)</option>
                {parentOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.pathLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wt-org-unit">Direction (optionnel)</Label>
              <OwnerOrgUnitSelect
                id="wt-org-unit"
                value={orgUnitId}
                onChange={setOrgUnitId}
                disabled={busy}
                triggerClassName="h-11 w-full min-h-11 text-sm sm:h-9 sm:min-h-9"
                placeholder="Aucune direction"
              />
              <p className="text-xs text-muted-foreground">
                Rattache l’équipe à une direction / unité de l’organisation client. Laisser vide si
                hors direction.
              </p>
            </div>
            <WorkTeamLeadCombobox
              id="wt-lead"
              value={leadResourceId}
              onChange={setLeadResourceId}
              fallbackLabel={mode === 'edit' ? team?.leadDisplayName ?? null : null}
              allowEmpty={mode === 'edit' && team?.status === 'ARCHIVED'}
              disabled={busy}
              dialogOpen={open}
            />
          </div>
        </form>
    </StariumModal>
  );
}
