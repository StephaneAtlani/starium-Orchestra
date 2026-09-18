'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import { listActionPlans } from '@/features/projects/api/action-plans.api';
import { toast } from '@/lib/toast';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  attachComplianceRemediationPlanForRequirement,
  type ComplianceRemediationPlanModeApi,
} from '../api/compliance.api';

function memberLabel(m: ClientMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  const base = name || m.email;
  const job = m.jobTitle?.trim();
  return job ? `${base} — ${job}` : base;
}

function defaultTargetDateIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

export function ComplianceRemediationPlanModal({
  open,
  onOpenChange,
  requirementId,
  requirementLabel,
  defaultTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementId: string | null;
  requirementLabel: string;
  defaultTitle?: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id;
  const queryClient = useQueryClient();
  const { data: members = [], isLoading: membersLoading } = useClientMembers();

  const [mode, setMode] = useState<ComplianceRemediationPlanModeApi>('CREATE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState(defaultTargetDateIso);
  const [ownerUserId, setOwnerUserId] = useState('');
  const [actionPlanId, setActionPlanId] = useState('');
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const plansQ = useQuery({
    queryKey: ['action-plans', clientId, 'remediation-picker'],
    queryFn: () =>
      listActionPlans(authFetch, { status: 'ACTIVE', limit: 100, offset: 0 }),
    enabled: open && mode === 'LINK' && Boolean(clientId),
  });

  useEffect(() => {
    if (!open) {
      setInitialized(false);
      setCreatedPlanId(null);
      return;
    }
    if (initialized) return;
    setMode('CREATE');
    setTitle(
      defaultTitle?.trim() ||
        `Remédier — ${requirementLabel}`.slice(0, 200),
    );
    setDescription('');
    setTargetDate(defaultTargetDateIso());
    setOwnerUserId(members[0]?.id ?? '');
    setActionPlanId('');
    setInitialized(true);
  }, [open, initialized, defaultTitle, requirementLabel, members]);

  const ownerMember = members.find((m) => m.id === ownerUserId);
  const planOptions = plansQ.data?.items ?? [];
  const selectedPlan = planOptions.find((p) => p.id === actionPlanId);

  const canSubmit = useMemo(() => {
    if (!requirementId) return false;
    if (mode === 'CREATE') return title.trim().length > 0;
    return Boolean(actionPlanId);
  }, [requirementId, mode, title, actionPlanId]);

  const mut = useMutation({
    mutationFn: () =>
      attachComplianceRemediationPlanForRequirement(authFetch, requirementId!, {
        mode,
        title: mode === 'CREATE' ? title.trim() : undefined,
        description: mode === 'CREATE' ? description.trim() || undefined : undefined,
        targetDate: targetDate
          ? new Date(`${targetDate}T12:00:00`).toISOString()
          : undefined,
        ownerUserId: ownerUserId || undefined,
        actionPlanId: mode === 'LINK' ? actionPlanId : undefined,
      }),
    onSuccess: async (res) => {
      toast.success(
        `Plan d’actions lié — ${displayLabel(res.actionPlan.title, 'Plan')}`,
      );
      setCreatedPlanId(res.actionPlan.id);
      await queryClient.invalidateQueries({
        queryKey: ['compliance', clientId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['action-plans', clientId],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Plan d’actions de remédiation"
      description={requirementLabel}
      icon={ListChecks}
      size="md"
      footer={
        <>
          {createdPlanId ? (
            <Link
              href={`/action-plans/${createdPlanId}`}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'mr-auto min-h-11 sm:min-h-9',
              )}
            >
              Ouvrir le plan
            </Link>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            {createdPlanId ? 'Fermer' : 'Annuler'}
          </Button>
          {!createdPlanId ? (
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              disabled={!canSubmit || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mode === 'CREATE' ? 'Créer et lier' : 'Rattacher'}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="starium-form flex flex-col gap-4">
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Mode</legend>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Mode de rattachement"
          >
            {(
              [
                { value: 'CREATE' as const, label: 'Créer un plan' },
                { value: 'LINK' as const, label: 'Rattacher un plan existant' },
              ] as const
            ).map((opt) => {
              const selected = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={Boolean(createdPlanId)}
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    'min-h-11 rounded-[var(--radius-md)] border-[1.5px] px-3 py-2.5 text-center text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    selected
                      ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)] text-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted/40',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {mode === 'CREATE' ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="rem-title">
                Objectif <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rem-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                disabled={Boolean(createdPlanId)}
                required
                aria-required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rem-desc">Description</Label>
              <Textarea
                id="rem-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={Boolean(createdPlanId)}
              />
            </div>
          </>
        ) : plansQ.isLoading ? (
          <LoadingState rows={3} />
        ) : plansQ.isError ? (
          <ErrorState
            message={
              plansQ.error instanceof Error
                ? plansQ.error.message
                : 'Impossible de charger les plans.'
            }
            onRetry={() => void plansQ.refetch()}
          />
        ) : planOptions.length === 0 ? (
          <EmptyState
            title="Aucun plan actif"
            description="Créez un plan ou passez en mode création."
          />
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="rem-plan">Plan d’actions</Label>
            <Select
              value={actionPlanId}
              onValueChange={(v) => setActionPlanId(v ?? '')}
              disabled={Boolean(createdPlanId)}
            >
              <SelectTrigger id="rem-plan" className="w-full min-h-11">
                <SelectValue placeholder="Choisir un plan">
                  {selectedPlan
                    ? firstDisplayLabel(
                        [`${selectedPlan.code} — ${selectedPlan.title}`],
                        'Plan',
                      )
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {planOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {firstDisplayLabel([`${p.code} — ${p.title}`], 'Plan')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rem-due">Échéance</Label>
            <Input
              id="rem-due"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="min-h-11"
              disabled={Boolean(createdPlanId)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rem-owner">Responsable</Label>
            <Select
              value={ownerUserId}
              onValueChange={(v) => setOwnerUserId(v ?? '')}
              disabled={membersLoading || Boolean(createdPlanId)}
            >
              <SelectTrigger id="rem-owner" className="w-full min-h-11">
                <SelectValue placeholder="Choisir">
                  {ownerMember ? memberLabel(ownerMember) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {memberLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </StariumModal>
  );
}
