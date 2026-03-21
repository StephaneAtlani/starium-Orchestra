'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { LoadingState } from '@/components/feedback/loading-state';
import { useBudgetsList } from '@/features/budgets/hooks/use-budgets';
import { useBudgetLinesByBudget } from '@/features/budgets/hooks/use-budget-lines';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useProjectBudgetLinksQuery } from '../hooks/use-project-budget-links-query';
import { useCreateProjectBudgetLink } from '../hooks/use-create-project-budget-link';
import { useDeleteProjectBudgetLink } from '../hooks/use-delete-project-budget-link';
import type {
  CreateProjectBudgetLinkPayload,
  ProjectBudgetAllocationType,
} from '../types/project.types';

const ALLOCATION_LABEL: Record<ProjectBudgetAllocationType, string> = {
  FULL: '100 % sur la ligne',
  PERCENTAGE: 'Pourcentages (somme 100 %)',
  FIXED: 'Montants fixes',
};

function isApiFormError(e: unknown): e is ApiFormError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as ApiFormError).message === 'string'
  );
}

export function ProjectBudgetSection({ projectId }: { projectId: string }) {
  const linksQuery = useProjectBudgetLinksQuery(projectId);
  const budgetsQuery = useBudgetsList({ limit: 100 });
  const [budgetId, setBudgetId] = useState<string>('');
  const linesQuery = useBudgetLinesByBudget(budgetId || null);

  const [allocationType, setAllocationType] =
    useState<ProjectBudgetAllocationType>('FULL');
  const [budgetLineId, setBudgetLineId] = useState('');
  const [percentage, setPercentage] = useState('');
  const [amount, setAmount] = useState('');

  const createMut = useCreateProjectBudgetLink(projectId);
  const deleteMut = useDeleteProjectBudgetLink(projectId);

  const activeLines = useMemo(() => {
    const lines = linesQuery.data ?? [];
    return lines.filter((l) => l.status === 'ACTIVE');
  }, [linesQuery.data]);

  const resetForm = () => {
    setBudgetLineId('');
    setPercentage('');
    setAmount('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetLineId) {
      toast.error('Choisissez une ligne budgétaire ACTIVE.');
      return;
    }

    const payload: CreateProjectBudgetLinkPayload = {
      budgetLineId,
      allocationType,
    };
    if (allocationType === 'PERCENTAGE') {
      const p = Number(percentage.replace(',', '.'));
      if (Number.isNaN(p)) {
        toast.error('Pourcentage invalide.');
        return;
      }
      payload.percentage = p;
    }
    if (allocationType === 'FIXED') {
      const a = Number(amount.replace(',', '.'));
      if (Number.isNaN(a)) {
        toast.error('Montant invalide.');
        return;
      }
      payload.amount = a;
    }

    try {
      await createMut.mutateAsync(payload);
      toast.success('Lien budget créé.');
      resetForm();
    } catch (err: unknown) {
      const msg = isApiFormError(err)
        ? err.message
        : 'Création impossible.';
      toast.error(msg);
    }
  };

  const onDelete = async (linkId: string) => {
    if (!window.confirm('Supprimer ce lien projet ↔ ligne budgétaire ?')) return;
    try {
      await deleteMut.mutateAsync(linkId);
      toast.success('Lien supprimé.');
    } catch (err: unknown) {
      const msg = isApiFormError(err)
        ? err.message
        : 'Suppression impossible.';
      toast.error(msg);
    }
  };

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Budget</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Liez le projet à une ou plusieurs lignes budgétaires (RFC-PROJ-010).
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {linksQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : (
          <>
            {!linksQuery.data?.items.length ? (
              <p className="text-sm text-muted-foreground">Aucun lien budgétaire.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ligne</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Détail</TableHead>
                    <TableHead className="w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linksQuery.data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-medium">{row.budgetLine.code}</span>{' '}
                        <span className="text-muted-foreground">{row.budgetLine.name}</span>
                      </TableCell>
                      <TableCell>{ALLOCATION_LABEL[row.allocationType]}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.allocationType === 'PERCENTAGE' && row.percentage != null
                          ? `${row.percentage} %`
                          : row.allocationType === 'FIXED' && row.amount != null
                            ? row.amount
                            : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={deleteMut.isPending}
                          onClick={() => onDelete(row.id)}
                          aria-label="Supprimer le lien"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-medium">Ajouter un lien</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pb-budget">Budget</Label>
                  <Select
                    value={budgetId || undefined}
                    onValueChange={(v) => {
                      setBudgetId(v ?? '');
                      setBudgetLineId('');
                    }}
                    disabled={budgetsQuery.isLoading}
                  >
                    <SelectTrigger id="pb-budget">
                      <SelectValue
                        placeholder={
                          budgetsQuery.isLoading ? 'Chargement…' : 'Choisir un budget'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(budgetsQuery.data?.items ?? []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.code} — {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pb-line">Ligne budgétaire (ACTIVE)</Label>
                  <Select
                    value={budgetLineId || undefined}
                    onValueChange={(v) => setBudgetLineId(v ?? '')}
                    disabled={!budgetId || linesQuery.isLoading}
                  >
                    <SelectTrigger id="pb-line">
                      <SelectValue placeholder="Choisir une ligne" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLines.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.code} — {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mode d’allocation</Label>
                  <Select
                    value={allocationType}
                    onValueChange={(v) =>
                      setAllocationType((v ?? 'FULL') as ProjectBudgetAllocationType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ALLOCATION_LABEL) as ProjectBudgetAllocationType[]).map(
                        (k) => (
                          <SelectItem key={k} value={k}>
                            {ALLOCATION_LABEL[k]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {allocationType === 'PERCENTAGE' && (
                  <div className="space-y-2">
                    <Label htmlFor="pb-pct">Pourcentage sur cette ligne</Label>
                    <Input
                      id="pb-pct"
                      inputMode="decimal"
                      placeholder="ex. 40"
                      value={percentage}
                      onChange={(ev) => setPercentage(ev.target.value)}
                    />
                  </div>
                )}
                {allocationType === 'FIXED' && (
                  <div className="space-y-2">
                    <Label htmlFor="pb-amt">Montant (devise budget)</Label>
                    <Input
                      id="pb-amt"
                      inputMode="decimal"
                      placeholder="ex. 12000"
                      value={amount}
                      onChange={(ev) => setAmount(ev.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button type="submit" disabled={createMut.isPending || !budgetLineId}>
                {createMut.isPending ? 'Enregistrement…' : 'Ajouter le lien'}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
