'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { useBudgetsQuery } from '../hooks/use-budgets-query';
import { budgetImport } from '../constants/budget-routes';
import { firstDisplayLabel } from '@/lib/display-label';
import { EMPTY_SELECT_VALUE } from '../budget-import/budget-import-field-labels';

export interface LaunchImportBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  profileName: string;
}

export function LaunchImportBudgetModal({
  open,
  onOpenChange,
  profileId,
  profileName,
}: LaunchImportBudgetModalProps) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useBudgetsQuery(
    { limit: 100, page: 1 },
    { enabled: open },
  );
  const [budgetId, setBudgetId] = useState<string>(EMPTY_SELECT_VALUE);

  const options = useMemo(() => {
    return (data?.items ?? []).map((b) => ({
      id: b.id,
      label: firstDisplayLabel([b.name, b.code], 'Budget'),
    }));
  }, [data?.items]);

  const selectedLabel =
    budgetId === EMPTY_SELECT_VALUE
      ? 'Choisir un budget'
      : (options.find((o) => o.id === budgetId)?.label ?? 'Budget');

  const canLaunch = budgetId !== EMPTY_SELECT_VALUE;

  const handleLaunch = () => {
    if (!canLaunch) return;
    onOpenChange(false);
    router.push(budgetImport(budgetId, profileId));
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Lancer l’import"
      description={`Profil « ${profileName} » — choisissez le budget cible.`}
      icon={Upload}
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleLaunch} disabled={!canLaunch}>
            Continuer
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        {isLoading ? <LoadingState rows={3} /> : null}
        {error ? (
          <ErrorState
            message="Impossible de charger les budgets. Réessayez ou vérifiez vos droits."
            onRetry={() => void refetch()}
          />
        ) : null}
        {!isLoading && !error && options.length === 0 ? (
          <EmptyState
            title="Aucun budget"
            description="Créez un budget avant de lancer un import."
          />
        ) : null}
        {!isLoading && !error && options.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="launch-import-budget">Budget cible</Label>
            <Select value={budgetId} onValueChange={(v) => setBudgetId(v ?? EMPTY_SELECT_VALUE)}>
              <SelectTrigger id="launch-import-budget" className="min-h-11 w-full sm:min-h-9">
                <SelectValue>{selectedLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Choisir un budget</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </StariumModal>
  );
}
