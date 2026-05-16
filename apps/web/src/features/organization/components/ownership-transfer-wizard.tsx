'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OwnerOrgUnitSelect } from './owner-org-unit-select';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import {
  OWNERSHIP_TRANSFER_RESOURCE_TYPES,
  postOwnershipTransfer,
  type OwnershipTransferResourceType,
  type OwnershipTransferResult,
} from '../api/organization-ownership.api';

const RESOURCE_TYPE_LABELS: Record<OwnershipTransferResourceType, string> = {
  PROJECT: 'Projets',
  BUDGET: 'Budgets',
  BUDGET_LINE: 'Lignes budgétaires (overrides)',
  SUPPLIER: 'Fournisseurs',
  CONTRACT: 'Contrats',
  STRATEGIC_OBJECTIVE: 'Objectifs stratégiques',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OwnershipTransferWizard({ open, onOpenChange }: Props) {
  const authFetch = useAuthenticatedFetch();
  const { has } = usePermissions();
  const [fromOrgUnitId, setFromOrgUnitId] = useState<string | null>(null);
  const [toOrgUnitId, setToOrgUnitId] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<OwnershipTransferResourceType[]>([
    'PROJECT',
    'BUDGET',
  ]);
  const [preview, setPreview] = useState<OwnershipTransferResult | null>(null);
  const [step, setStep] = useState<'form' | 'preview' | 'done'>('form');

  const dryRunMutation = useMutation({
    mutationFn: () =>
      postOwnershipTransfer(authFetch, {
        fromOrgUnitId: fromOrgUnitId!,
        toOrgUnitId: toOrgUnitId!,
        resourceTypes: selectedTypes,
        dryRun: true,
        page: 1,
        limit: 50,
      }),
    onSuccess: (data) => {
      setPreview(data);
      setStep('preview');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      postOwnershipTransfer(authFetch, {
        fromOrgUnitId: fromOrgUnitId!,
        toOrgUnitId: toOrgUnitId!,
        resourceTypes: selectedTypes,
        dryRun: false,
        confirmApply: true,
      }),
    onSuccess: () => {
      toast.success('Transfert de propriété appliqué');
      setStep('done');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalCount = useMemo(
    () =>
      preview
        ? Object.values(preview.countsByType).reduce((a, b) => a + b, 0)
        : 0,
    [preview],
  );

  function resetAndClose() {
    setFromOrgUnitId(null);
    setToOrgUnitId(null);
    setPreview(null);
    setStep('form');
    onOpenChange(false);
  }

  function toggleType(type: OwnershipTransferResourceType, checked: boolean) {
    setSelectedTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type),
    );
  }

  const canPreview =
    fromOrgUnitId && toOrgUnitId && fromOrgUnitId !== toOrgUnitId && selectedTypes.length > 0;

  if (!has('organization.ownership.transfer')) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfert de Direction propriétaire</DialogTitle>
          <DialogDescription>
            Déplace les ressources dont la colonne propriétaire pointe vers l’unité source.
            Les lignes budgétaires héritées du budget parent sans override ne sont pas modifiées.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Direction source</Label>
              <OwnerOrgUnitSelect value={fromOrgUnitId} onChange={setFromOrgUnitId} />
            </div>
            <div className="space-y-2">
              <Label>Direction cible</Label>
              <OwnerOrgUnitSelect value={toOrgUnitId} onChange={setToOrgUnitId} />
            </div>
            <div className="space-y-2">
              <Label>Types de ressources</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {OWNERSHIP_TRANSFER_RESOURCE_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={(c) => toggleType(type, c === true)}
                    />
                    {RESOURCE_TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-3 py-2 text-sm">
            <p>
              <strong>{totalCount}</strong> ressource(s) seront transférées.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {Object.entries(preview.countsByType).map(([type, count]) => (
                <li key={type}>
                  {RESOURCE_TYPE_LABELS[type as OwnershipTransferResourceType] ?? type} : {count}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 'done' && (
          <p className="py-4 text-sm text-muted-foreground">Transfert terminé.</p>
        )}

        <DialogFooter>
          {step === 'form' && (
            <>
              <Button variant="outline" onClick={resetAndClose}>
                Annuler
              </Button>
              <Button
                disabled={!canPreview || dryRunMutation.isPending}
                onClick={() => dryRunMutation.mutate()}
              >
                Prévisualiser
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('form')}>
                Retour
              </Button>
              <Button
                disabled={applyMutation.isPending || totalCount === 0}
                onClick={() => applyMutation.mutate()}
              >
                Confirmer le transfert
              </Button>
            </>
          )}
          {step === 'done' && <Button onClick={resetAndClose}>Fermer</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
