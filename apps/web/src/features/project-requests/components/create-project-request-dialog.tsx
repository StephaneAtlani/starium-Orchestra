'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { ApiFormError } from '@/features/budgets/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import {
  createProjectRequest,
  fetchValidatorOptions,
  fetchWorkflowSettings,
  type ProjectRequestDto,
} from '../api/project-requests.api';
import { PROJECT_REQUEST_URGENCY_LABELS } from '../constants/project-request-labels';

const URGENCY_OPTIONS = Object.entries(PROJECT_REQUEST_URGENCY_LABELS);

type CreateProjectRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si défini, redirection vers la fiche après création ; sinon reste sur la liste. */
  navigateToDetailOnSuccess?: boolean;
};

const EMPTY_FORM = {
  title: '',
  description: '',
  expectedBenefits: '',
  businessContext: '',
  riskIfNotDone: '',
  urgency: '',
  estimatedBudget: '',
  validatorUserId: '',
};

export function CreateProjectRequestDialog({
  open,
  onOpenChange,
  navigateToDetailOnSuccess = true,
}: CreateProjectRequestDialogProps) {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setFormError(null);
    }
  }, [open]);

  const { data: settings } = useQuery({
    queryKey: ['project-request-workflow-settings', clientId],
    queryFn: () => fetchWorkflowSettings(authFetch),
    enabled: !!clientId && open,
  });

  const canPickValidator = settings?.resolved.allowRequesterToSelectValidator !== false;

  const { data: validators, isLoading: validatorsLoading } = useQuery({
    queryKey: ['project-request-validator-options', clientId],
    queryFn: () => fetchValidatorOptions(authFetch),
    enabled: !!clientId && open && canPickValidator,
  });

  const mutation = useMutation<ProjectRequestDto, ApiFormError>({
    mutationFn: () => {
      const budgetRaw = form.estimatedBudget.trim().replace(/\s/g, '').replace(',', '.');
      const estimatedBudget =
        budgetRaw.length > 0 ? Number.parseFloat(budgetRaw) : undefined;

      return createProjectRequest(authFetch, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        expectedBenefits: form.expectedBenefits.trim(),
        businessContext: form.businessContext.trim() || undefined,
        riskIfNotDone: form.riskIfNotDone.trim() || undefined,
        urgency: form.urgency || undefined,
        estimatedBudget:
          estimatedBudget != null && !Number.isNaN(estimatedBudget)
            ? estimatedBudget
            : undefined,
        validatorUserId: form.validatorUserId || undefined,
      });
    },
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: ['project-requests', clientId] });
      toast.success('Demande créée en brouillon.');
      onOpenChange(false);
      if (navigateToDetailOnSuccess) {
        router.push(`/projects/requests/${row.id}`);
      }
    },
    onError: (err) => {
      setFormError(err.message ?? 'Création impossible.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError('Le titre est obligatoire.');
      return;
    }
    if (!form.expectedBenefits.trim()) {
      setFormError('Le gain métier attendu est obligatoire.');
      return;
    }

    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Nouvelle demande projet</DialogTitle>
          <DialogDescription>
            Décrivez le besoin et son enjeu métier. La demande sera enregistrée en brouillon avant
            soumission au validateur.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="space-y-4">
            <h3 className="text-sm font-medium">Identification</h3>
            <div className="space-y-2">
              <Label htmlFor="pr-title">Titre</Label>
              <Input
                id="pr-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex. Déploiement SSO fournisseurs"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-description">Description</Label>
              <Textarea
                id="pr-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Contexte, périmètre, livrables attendus…"
                rows={3}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Enjeu métier</h3>
            <div className="space-y-2">
              <Label htmlFor="pr-benefits">Gain métier attendu</Label>
              <Textarea
                id="pr-benefits"
                value={form.expectedBenefits}
                onChange={(e) => setForm((f) => ({ ...f, expectedBenefits: e.target.value }))}
                placeholder="Valeur, gains quantifiables, bénéfices pour le métier…"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-context">Contexte métier</Label>
              <Textarea
                id="pr-context"
                value={form.businessContext}
                onChange={(e) => setForm((f) => ({ ...f, businessContext: e.target.value }))}
                placeholder="Situation actuelle, contraintes, parties prenantes…"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-risk">Risque si non réalisé</Label>
              <Textarea
                id="pr-risk"
                value={form.riskIfNotDone}
                onChange={(e) => setForm((f) => ({ ...f, riskIfNotDone: e.target.value }))}
                placeholder="Impacts opérationnels, réglementaires, financiers…"
                rows={2}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Priorisation</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Urgence</Label>
                <Select
                  value={form.urgency}
                  onValueChange={(v) => setForm((f) => ({ ...f, urgency: v ?? '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une urgence" />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-budget">Budget estimé (€)</Label>
                <Input
                  id="pr-budget"
                  inputMode="decimal"
                  value={form.estimatedBudget}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedBudget: e.target.value }))}
                  placeholder="Ex. 45000"
                />
              </div>
            </div>
          </section>

          {canPickValidator ? (
            <section className="space-y-4">
              <h3 className="text-sm font-medium">Validation</h3>
              <div className="space-y-2">
                <Label>Validateur</Label>
                {validatorsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Select
                    value={form.validatorUserId}
                    onValueChange={(v) => setForm((f) => ({ ...f, validatorUserId: v ?? '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un validateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {(validators ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </section>
          ) : null}

          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enregistrement…' : 'Créer le brouillon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}