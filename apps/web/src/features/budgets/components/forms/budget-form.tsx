'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EntityVisualPicker } from '@/components/ui/entity-visual-picker';
import { createBudgetSchema, type CreateBudgetInput } from '../../schemas/create-budget.schema';
import { BudgetFormActions } from './budget-form-actions';
import { BudgetValidationWorkflowStrip } from './budget-validation-workflow-strip';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import { OwnerOrgUnitSelect } from '@/features/organization/components/owner-org-unit-select';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import type { ApiFormError } from '../../api/types';
import {
  BUDGET_WORKFLOW_STATUSES,
  BUDGET_WORKFLOW_STATUS_LABELS,
} from '../../constants/budget-workflow-status';
import { budgetStatusSelectOptionsForEdit } from '../../constants/budget-status-transitions';
import type { BudgetWorkflowStatus } from '../../constants/budget-workflow-status';

const CURRENCY_OPTIONS = [{ value: 'EUR', label: 'EUR' }] as const;
const STATUS_OPTIONS_CREATE = BUDGET_WORKFLOW_STATUSES.map((value) => ({
  value,
  label: BUDGET_WORKFLOW_STATUS_LABELS[value],
}));

const fieldClass = 'space-y-2';
const triggerClass = 'min-h-11 w-full sm:min-h-9';

function clientMemberDisplayLabel(m: ClientMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  if (name) return `${name} (${m.email})`;
  return m.email;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

interface BudgetFormProps {
  defaultValues: Partial<CreateBudgetInput>;
  onSubmit: (values: CreateBudgetInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelHref: string;
  submitError?: ApiFormError | null;
  exerciseOptions: { id: string; name: string; code: string | null }[];
  /** En édition : restreindre le select aux transitions autorisées par l’API. */
  editStatusFrom?: BudgetWorkflowStatus;
  /** Responsable actuel absent de la liste membres — garde une option affichable. */
  ownerUserFallback?: { id: string; label: string } | null;
}

export function BudgetForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
  cancelHref,
  submitError,
  exerciseOptions,
  editStatusFrom,
  ownerUserFallback,
}: BudgetFormProps) {
  const { data: members = [], isLoading: membersLoading } = useClientMembers();

  const activeMembers = useMemo(
    () =>
      [...members]
        .filter((m) => m.status === 'ACTIVE')
        .sort((a, b) =>
          clientMemberDisplayLabel(a).localeCompare(clientMemberDisplayLabel(b), 'fr'),
        ),
    [members],
  );

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      currency: 'EUR',
      status: 'DRAFT',
      taxMode: 'HT',
      ownerUserId: '',
      ownerOrgUnitId: null,
      ...defaultValues,
      iconKey: defaultValues.iconKey ?? 'wallet',
      accentToken: defaultValues.accentToken ?? 'brand-gold',
    },
  });

  useEffect(() => {
    if (submitError?.fieldErrors) {
      for (const [field, message] of Object.entries(submitError.fieldErrors)) {
        setError(field as keyof CreateBudgetInput, { type: 'server', message });
      }
    }
  }, [submitError, setError]);

  const onInvalid = (errs: Partial<Record<keyof CreateBudgetInput, { message?: string }>>) => {
    const first = Object.keys(errs)[0] as keyof CreateBudgetInput | undefined;
    if (first) document.getElementById(String(first))?.focus();
  };

  const watchedStatus = watch('status');
  const watchedIconKey = watch('iconKey');
  const watchedAccentToken = watch('accentToken');
  const statusOptions =
    editStatusFrom != null
      ? budgetStatusSelectOptionsForEdit((watchedStatus ?? editStatusFrom) as BudgetWorkflowStatus)
      : STATUS_OPTIONS_CREATE;

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6" noValidate>
      {submitError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Enregistrement impossible</AlertTitle>
          <AlertDescription>{submitError.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="starium-section-title text-base">Rattachement</CardTitle>
          <CardDescription className="starium-section-subtitle">
            Exercice budgétaire de rattachement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={fieldClass}>
            <Label htmlFor="exerciseId">Exercice *</Label>
            <Controller
              name="exerciseId"
              control={control}
              render={({ field }) => {
                const selected = exerciseOptions.find((ex) => ex.id === field.value);
                const selectedLabel = selected
                  ? `${selected.name}${selected.code ? ` (${selected.code})` : ''}`
                  : null;
                return (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value ?? '')}
                  >
                    <SelectTrigger
                      id="exerciseId"
                      className={triggerClass}
                      aria-invalid={!!errors.exerciseId}
                      aria-describedby={errors.exerciseId ? 'exerciseId-error' : undefined}
                    >
                      <SelectValue placeholder="Sélectionner un exercice">
                        {selectedLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {exerciseOptions.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          {ex.name}
                          {ex.code ? ` (${ex.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            <FieldError id="exerciseId-error" message={errors.exerciseId?.message} />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="starium-section-title text-base">Identité</CardTitle>
          <CardDescription className="starium-section-subtitle">
            Libellés, responsable et direction.
          </CardDescription>
          <CardAction>
            <EntityVisualPicker
              id="budget-visual"
              label=""
              className="space-y-0"
              iconKey={watchedIconKey}
              accentToken={watchedAccentToken}
              defaultIconKey="wallet"
              defaultAccentToken="brand-gold"
              onChange={({ iconKey, accentToken }) => {
                setValue('iconKey', iconKey, { shouldDirty: true });
                setValue('accentToken', accentToken, { shouldDirty: true });
              }}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldClass}>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                className={triggerClass}
                {...register('name')}
                placeholder="Ex. Budget SI"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              <FieldError id="name-error" message={errors.name?.message} />
            </div>
            <div className={fieldClass}>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                className={triggerClass}
                {...register('code')}
                placeholder="Ex. BUD-2025"
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? 'code-error' : undefined}
              />
              <FieldError id="code-error" message={errors.code?.message} />
            </div>
          </div>

          <div className={fieldClass}>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Description optionnelle"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
              {...register('description')}
            />
            <FieldError id="description-error" message={errors.description?.message} />
          </div>

          <div className={fieldClass}>
            <Label htmlFor="ownerUserId">Responsable du budget *</Label>
            <Controller
              name="ownerUserId"
              control={control}
              render={({ field }) => {
                const selectedLabel =
                  (ownerUserFallback && ownerUserFallback.id === field.value
                    ? ownerUserFallback.label
                    : null) ??
                  (activeMembers.find((m) => m.id === field.value)
                    ? clientMemberDisplayLabel(activeMembers.find((m) => m.id === field.value)!)
                    : null);
                return (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    disabled={membersLoading}
                  >
                    <SelectTrigger
                      id="ownerUserId"
                      className={triggerClass}
                      aria-invalid={!!errors.ownerUserId}
                      aria-describedby={
                        errors.ownerUserId
                          ? 'ownerUserId-error'
                          : 'ownerUserId-hint'
                      }
                    >
                      <SelectValue placeholder="Sélectionner un membre…">
                        {selectedLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ownerUserFallback &&
                      !activeMembers.some((m) => m.id === ownerUserFallback.id) ? (
                        <SelectItem value={ownerUserFallback.id}>
                          {ownerUserFallback.label}
                        </SelectItem>
                      ) : null}
                      {activeMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {clientMemberDisplayLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {membersLoading ? (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Chargement des membres du client…
              </p>
            ) : activeMembers.length === 0 ? (
              <p className="text-xs text-destructive" role="alert">
                Aucun membre actif sur ce client — ajoutez un membre pour désigner un responsable.
              </p>
            ) : (
              <p id="ownerUserId-hint" className="text-xs text-muted-foreground">
                Le responsable doit être un utilisateur rattaché au client actif.
              </p>
            )}
            <FieldError id="ownerUserId-error" message={errors.ownerUserId?.message} />
          </div>

          <div className={fieldClass}>
            <Label htmlFor="ownerOrgUnitId">Direction</Label>
            <Controller
              name="ownerOrgUnitId"
              control={control}
              render={({ field }) => (
                <OwnerOrgUnitSelect
                  id="ownerOrgUnitId"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  triggerClassName={triggerClass}
                  placeholder="Aucune direction"
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Direction propriétaire : rattachement par défaut des lignes et filtre du portefeuille.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="starium-section-title text-base">Pilotage</CardTitle>
          <CardDescription className="starium-section-subtitle">
            Devise, statut workflow et paramètres fiscaux.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldClass}>
              <Label htmlFor="currency">Devise *</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value ?? 'EUR')}
                  >
                    <SelectTrigger
                      id="currency"
                      className={triggerClass}
                      aria-invalid={!!errors.currency}
                      aria-describedby={errors.currency ? 'currency-error' : undefined}
                    >
                      <SelectValue placeholder="Devise">{field.value}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="currency-error" message={errors.currency?.message} />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="status">Statut</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => {
                  const currentLabel =
                    statusOptions.find((opt) => opt.value === field.value)?.label ?? null;
                  return (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value ?? 'DRAFT')}
                    >
                      <SelectTrigger
                        id="status"
                        className={triggerClass}
                        aria-invalid={!!errors.status}
                        aria-describedby={errors.status ? 'status-error' : undefined}
                      >
                        <SelectValue placeholder="Statut">{currentLabel}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              <FieldError id="status-error" message={errors.status?.message} />
            </div>
          </div>

          {editStatusFrom != null ? (
            <div className={fieldClass}>
              <Label htmlFor="statusChangeComment">
                Commentaire (optionnel, si vous modifiez le statut)
              </Label>
              <Textarea
                id="statusChangeComment"
                rows={3}
                placeholder="Visible dans l’onglet Historique de la fiche budget."
                aria-invalid={!!errors.statusChangeComment}
                aria-describedby={
                  errors.statusChangeComment ? 'statusChangeComment-error' : undefined
                }
                {...register('statusChangeComment')}
              />
              <FieldError
                id="statusChangeComment-error"
                message={errors.statusChangeComment?.message}
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldClass}>
              <Label htmlFor="taxMode">Mode fiscal</Label>
              <Controller
                name="taxMode"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value ?? 'HT')}
                  >
                    <SelectTrigger
                      id="taxMode"
                      className={triggerClass}
                      aria-invalid={!!errors.taxMode}
                      aria-describedby={errors.taxMode ? 'taxMode-error' : undefined}
                    >
                      <SelectValue placeholder="Mode fiscal">{field.value}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HT">HT</SelectItem>
                      <SelectItem value="TTC">TTC</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="taxMode-error" message={errors.taxMode?.message} />
            </div>

            <div className={fieldClass}>
              <Label htmlFor="defaultTaxRate">TVA par défaut (%)</Label>
              <Input
                id="defaultTaxRate"
                type="number"
                step="0.01"
                className={triggerClass}
                placeholder="Ex. 20"
                aria-invalid={!!errors.defaultTaxRate}
                aria-describedby={errors.defaultTaxRate ? 'defaultTaxRate-error' : undefined}
                {...register('defaultTaxRate')}
              />
              <FieldError id="defaultTaxRate-error" message={errors.defaultTaxRate?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="starium-section-title text-base">
            Workflow de validation
          </CardTitle>
          <CardDescription className="starium-section-subtitle">
            Repère du statut courant dans le cycle budgétaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetValidationWorkflowStrip
            currentStatus={watchedStatus as BudgetWorkflowStatus | undefined}
          />
        </CardContent>
      </Card>

      <BudgetFormActions
        cancelHref={cancelHref}
        submitLabel={submitLabel}
        isSubmitting={isSubmitting}
      />
    </form>
  );
}
