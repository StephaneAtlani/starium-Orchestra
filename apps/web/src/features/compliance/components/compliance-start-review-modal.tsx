'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Play } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import { toast } from '@/lib/toast';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  createComplianceCampaign,
  getComplianceFrameworkOverview,
  type ComplianceCampaignModalityApi,
  type ComplianceFrameworkDomainApi,
} from '../api/compliance.api';

const MODALITY_OPTIONS: Array<{
  value: ComplianceCampaignModalityApi;
  label: string;
}> = [
  { value: 'SELF_ASSESSMENT', label: 'Auto-évaluation' },
  { value: 'INTERNAL_AUDIT', label: 'Audit interne' },
  { value: 'EXTERNAL_AUDIT', label: 'Audit externe' },
];

function memberLabel(m: ClientMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  const base = name || m.email;
  const job = m.jobTitle?.trim();
  return job ? `${base} — ${job}` : base;
}

function defaultDueDateIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultCampaignName(frameworkLabel: string): string {
  const year = new Date().getFullYear();
  const label = frameworkLabel.trim() || 'conformité';
  return `Revue ${label} — ${year}`;
}

export function ComplianceStartReviewModal({
  open,
  onOpenChange,
  frameworkId,
  frameworkLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string;
  frameworkLabel: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id;
  const queryClient = useQueryClient();
  const { data: members = [], isLoading: membersLoading } = useClientMembers();

  const [name, setName] = useState('');
  const [selectedDomainKeys, setSelectedDomainKeys] = useState<Set<string>>(
    new Set(),
  );
  const [ownerUserId, setOwnerUserId] = useState('');
  const [dueAt, setDueAt] = useState(defaultDueDateIso);
  const [modality, setModality] =
    useState<ComplianceCampaignModalityApi>('SELF_ASSESSMENT');
  const [initialized, setInitialized] = useState(false);

  const overviewQ = useQuery({
    queryKey: [
      'compliance',
      'framework',
      clientId,
      frameworkId,
      'overview',
      'start-review',
    ],
    queryFn: () => getComplianceFrameworkOverview(authFetch, frameworkId),
    enabled: open && Boolean(clientId) && Boolean(frameworkId),
  });

  const domains = overviewQ.data?.domains ?? [];

  useEffect(() => {
    if (!open) {
      setInitialized(false);
      return;
    }
    if (initialized || !overviewQ.data) return;
    setName(defaultCampaignName(frameworkLabel));
    setSelectedDomainKeys(new Set(overviewQ.data.domains.map((d) => d.key)));
    setDueAt(defaultDueDateIso());
    setModality('SELF_ASSESSMENT');
    setOwnerUserId((prev) => {
      if (prev && members.some((m) => m.id === prev)) return prev;
      return members[0]?.id ?? '';
    });
    setInitialized(true);
  }, [open, initialized, overviewQ.data, frameworkLabel, members]);

  useEffect(() => {
    if (!open || !initialized || ownerUserId) return;
    if (members[0]?.id) setOwnerUserId(members[0].id);
  }, [open, initialized, members, ownerUserId]);

  const selectedCount = useMemo(() => {
    return domains
      .filter((d) => selectedDomainKeys.has(d.key))
      .reduce((sum, d) => sum + d.requirementCount, 0);
  }, [domains, selectedDomainKeys]);

  const ownerMember = members.find((m) => m.id === ownerUserId);
  const canSubmit =
    name.trim().length > 0 &&
    selectedDomainKeys.size > 0 &&
    selectedCount > 0 &&
    !overviewQ.isLoading;

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['compliance', 'campaigns', clientId, frameworkId],
    });
    await queryClient.invalidateQueries({
      queryKey: ['compliance', 'campaigns', clientId, 'all'],
    });
    await queryClient.invalidateQueries({
      queryKey: ['compliance', 'framework', clientId, frameworkId, 'overview'],
    });
  };

  const startMut = useMutation({
    mutationFn: () =>
      createComplianceCampaign(authFetch, {
        frameworkId,
        name: name.trim(),
        openImmediately: true,
        createSnapshot: true,
        scopeDomainKeys: Array.from(selectedDomainKeys),
        modality,
        ownerUserId: ownerUserId || undefined,
        dueAt: dueAt ? new Date(`${dueAt}T12:00:00`).toISOString() : undefined,
      }),
    onSuccess: async (camp) => {
      toast.success(
        `Revue démarrée — ${displayLabel(camp.name, 'Campagne')}`,
      );
      await invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDomain = (key: string) => {
    setSelectedDomainKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fwName = firstDisplayLabel(
    [overviewQ.data?.framework.name, frameworkLabel],
    'Référentiel',
  );

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Lancer une revue de conformité"
      description={`Campagne d'évaluation — ${fwName}`}
      icon={Pencil}
      size="lg"
      footer={
        <>
          <span
            className="mr-auto text-[12.5px] font-semibold text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {selectedCount > 0
              ? `${selectedCount} exigence${selectedCount > 1 ? 's' : ''} sélectionnée${selectedCount > 1 ? 's' : ''}`
              : 'Aucune exigence sélectionnée'}
          </span>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 gap-2 sm:min-h-9"
            disabled={!canSubmit || startMut.isPending}
            onClick={() => startMut.mutate()}
          >
            <Play className="size-4" aria-hidden />
            Lancer la revue
          </Button>
        </>
      }
    >
      {overviewQ.isLoading ? (
        <LoadingState rows={4} />
      ) : overviewQ.isError ? (
        <ErrorState
          message={
            overviewQ.error instanceof Error
              ? overviewQ.error.message
              : 'Impossible de charger le référentiel.'
          }
          onRetry={() => void overviewQ.refetch()}
        />
      ) : domains.length === 0 ? (
        <EmptyState
          title="Aucun domaine à évaluer"
          description="Ce référentiel ne contient pas encore d’exigences."
        />
      ) : (
        <div className="starium-form flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="rv-name">
              Intitulé de la campagne{' '}
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Input
              id="rv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. : Revue annuelle ISO 27001"
              maxLength={200}
              required
              aria-required
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium leading-none">
              Périmètre à évaluer
            </legend>
            <div
              className="flex max-h-56 flex-col gap-[7px] overflow-y-auto pr-0.5"
              role="group"
              aria-label="Domaines du référentiel"
            >
              {domains.map((domain) => (
                <DomainScopeRow
                  key={domain.key}
                  domain={domain}
                  selected={selectedDomainKeys.has(domain.key)}
                  onToggle={() => toggleDomain(domain.key)}
                />
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rv-owner">Responsable de la revue</Label>
              <Select
                value={ownerUserId || undefined}
                onValueChange={(v) => setOwnerUserId(v ?? '')}
                disabled={membersLoading || members.length === 0}
              >
                <SelectTrigger id="rv-owner" className="w-full min-h-11">
                  <SelectValue placeholder="Choisir un responsable">
                    {ownerUserId
                      ? memberLabel(
                          ownerMember ?? {
                            id: ownerUserId,
                            email: 'Membre',
                            firstName: null,
                            lastName: null,
                            role: 'CLIENT_USER',
                            status: 'ACTIVE',
                          },
                        )
                      : null}
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
            <div className="space-y-1.5">
              <Label htmlFor="rv-due">Échéance</Label>
              <Input
                id="rv-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="min-h-11"
              />
            </div>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium leading-none">
              Modalité
            </legend>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Modalité de la revue"
            >
              {MODALITY_OPTIONS.map((opt) => {
                const selected = modality === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setModality(opt.value)}
                    className={cn(
                      'min-h-11 rounded-[var(--radius-md)] border-[1.5px] px-3 py-2.5 text-center text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      selected
                        ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)] text-foreground shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-gold)_14%,transparent)]'
                        : 'border-border bg-card text-foreground hover:bg-muted/40',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}
    </StariumModal>
  );
}

function DomainScopeRow({
  domain,
  selected,
  onToggle,
}: {
  domain: ComplianceFrameworkDomainApi;
  selected: boolean;
  onToggle: () => void;
}) {
  const label = displayLabel(domain.label, 'Domaine');
  const count = domain.requirementCount;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        'flex min-h-11 w-full items-center gap-[11px] rounded-[var(--radius-md)] border-[1.5px] px-[13px] py-[11px] text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        selected
          ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)]'
          : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px]',
          selected
            ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-[color:var(--brand-ink)]'
            : 'border-border text-transparent',
        )}
        aria-hidden
      >
        <Check className="size-3.5 stroke-[3]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-foreground">
          {label}
        </span>
        <span className="block text-[11.5px] text-muted-foreground">
          {count} exigence{count > 1 ? 's' : ''}
        </span>
      </span>
      <span className="shrink-0 text-xs font-extrabold tabular-nums text-muted-foreground">
        {count}
      </span>
    </button>
  );
}
