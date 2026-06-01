'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listBudgets } from '@/features/budgets/api/budget-management.api';
import { listProjects } from '@/features/projects/api/projects.api';
import { toast } from '@/lib/toast';
import { GOVERNANCE_CYCLE_ITEM_SOURCE_TYPE_OPTIONS_V1 } from '../lib/governance-cycle-labels';
import {
  createGovernanceCycleItemSchema,
  getFirstZodError,
  type CreateGovernanceCycleItemFormValues,
} from '../schemas/governance-cycle.schemas';
import {
  getApiErrorMessage,
  useCreateGovernanceCycleItemMutation,
} from '../hooks/use-governance-cycles';

const emptyForm: CreateGovernanceCycleItemFormValues = {
  sourceType: 'PROJECT',
  title: '',
  description: '',
  projectId: '',
  budgetId: '',
};

export function AddCycleItemDialog({
  open,
  onOpenChange,
  cycleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [form, setForm] = useState<CreateGovernanceCycleItemFormValues>(emptyForm);
  const createMutation = useCreateGovernanceCycleItemMutation(cycleId);

  const projectsQuery = useQuery({
    queryKey: ['governance-cycles', clientId, 'add-item', 'projects'],
    queryFn: () => listProjects(authFetch, { page: 1, limit: 100 }),
    enabled: open && Boolean(clientId) && form.sourceType === 'PROJECT',
  });

  const budgetsQuery = useQuery({
    queryKey: ['governance-cycles', clientId, 'add-item', 'budgets'],
    queryFn: () => listBudgets(authFetch, { limit: 100, offset: 0 }),
    enabled: open && Boolean(clientId) && form.sourceType === 'BUDGET',
  });

  const projectOptions = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((p) => ({
        value: p.id,
        label: [p.code, p.name].filter(Boolean).join(' — ') || p.name,
      })),
    [projectsQuery.data?.items],
  );

  const budgetOptions = useMemo(
    () =>
      (budgetsQuery.data?.items ?? []).map((b) => ({
        value: b.id,
        label: [b.code, b.name].filter(Boolean).join(' — ') || b.name,
      })),
    [budgetsQuery.data?.items],
  );

  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createGovernanceCycleItemSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      await createMutation.mutateAsync(parsed.data);
      toast.success('Élément ajouté au cycle');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un élément au cycle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.sourceType}
              onValueChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  sourceType: v as CreateGovernanceCycleItemFormValues['sourceType'],
                  projectId: '',
                  budgetId: '',
                  title: '',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOVERNANCE_CYCLE_ITEM_SOURCE_TYPE_OPTIONS_V1.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.sourceType === 'PROJECT' ? (
            <div className="space-y-2">
              <Label>Projet</Label>
              <Select
                value={form.projectId ?? ''}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, projectId: v || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un projet…" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {form.sourceType === 'BUDGET' ? (
            <div className="space-y-2">
              <Label>Budget</Label>
              <Select
                value={form.budgetId ?? ''}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, budgetId: v || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un budget…" />
                </SelectTrigger>
                <SelectContent>
                  {budgetOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {form.sourceType === 'MANUAL' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="manual-title">Titre</Label>
                <Input
                  id="manual-title"
                  value={form.title ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-desc">Description</Label>
                <textarea
                  id="manual-desc"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.description ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
            </>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Ajout…' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
