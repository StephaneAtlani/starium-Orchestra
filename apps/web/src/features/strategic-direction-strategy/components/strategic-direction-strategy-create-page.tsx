'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useCreateStrategicDirectionStrategyMutation,
  useStrategicDirectionOptionsQuery,
  useStrategicDirectionStrategyPortfolioQuery,
  useStrategicVisionOptionsQuery,
} from '../hooks/use-strategic-direction-strategy-queries';

export function StrategicDirectionStrategyCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const directionFromQuery = searchParams.get('directionId') ?? '';
  const visionFromQuery = searchParams.get('alignedVisionId') ?? '';

  const { has } = usePermissions();
  const canCreateGlobal = has('strategic_direction_strategy.create');
  const canRead = has('strategic_direction_strategy.read');

  const portfolioQ = useStrategicDirectionStrategyPortfolioQuery(
    {},
    { enabled: canRead },
  );
  const creatableDirectionIds = useMemo(() => {
    if (canCreateGlobal) return null;
    return new Set(
      (portfolioQ.data ?? [])
        .filter((card) => card.canCreateStrategy)
        .map((card) => card.directionId),
    );
  }, [canCreateGlobal, portfolioQ.data]);

  const canAccessCreate =
    canCreateGlobal ||
    (canRead &&
      (creatableDirectionIds?.has(directionFromQuery) ||
        (creatableDirectionIds?.size ?? 0) > 0 ||
        portfolioQ.isLoading));

  const directionsQ = useStrategicDirectionOptionsQuery({
    enabled: canAccessCreate,
  });
  const visionsQ = useStrategicVisionOptionsQuery({ enabled: canAccessCreate });
  const createMutation = useCreateStrategicDirectionStrategyMutation();

  const defaultVisionId = useMemo(() => {
    if (visionFromQuery) return visionFromQuery;
    const list = visionsQ.data ?? [];
    const active = list.find((v) => v.isActive);
    return active?.id ?? list[0]?.id ?? '';
  }, [visionFromQuery, visionsQ.data]);

  const [directionId, setDirectionId] = useState(directionFromQuery);
  const [alignedVisionId, setAlignedVisionId] = useState('');
  const [title, setTitle] = useState('');
  const [ambition, setAmbition] = useState('');
  const [context, setContext] = useState('');
  const [horizonLabel, setHorizonLabel] = useState('');

  const visionId = alignedVisionId || defaultVisionId;

  const selectedVision = (visionsQ.data ?? []).find((v) => v.id === visionId);
  const directionOptions = (directionsQ.data ?? []).filter(
    (d) => canCreateGlobal || creatableDirectionIds?.has(d.id),
  );
  const selectedDirection = directionOptions.find((d) => d.id === directionId);

  if (!canAccessCreate) {
    return (
      <PageContainer>
        <EmptyState
          title="Création non autorisée"
          description="Vous n’avez pas la permission de créer une stratégie de direction. Les sponsors peuvent créer le schéma de leur propre direction."
          action={
            <Link
              href="/strategic-direction-strategy"
              className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
            >
              Retour au portefeuille
            </Link>
          }
        />
      </PageContainer>
    );
  }

  if (directionsQ.isLoading || visionsQ.isLoading || portfolioQ.isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (
    !canCreateGlobal &&
    directionOptions.length === 0
  ) {
    return (
      <PageContainer>
        <EmptyState
          title="Aucune direction à créer"
          description="Vous n’êtes sponsor d’aucune direction sans schéma, ou la fiche RH n’est pas liée à votre compte."
          action={
            <Link
              href="/strategic-direction-strategy"
              className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
            >
              Retour au portefeuille
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const onSubmit = async () => {
    if (!directionId || !visionId) {
      toast.error('Direction et vision sont requises.');
      return;
    }
    const resolvedHorizon =
      horizonLabel.trim() || selectedVision?.horizonLabel?.trim() || '';
    if (!title.trim() || !ambition.trim() || !context.trim() || !resolvedHorizon) {
      toast.error('Titre, ambition, contexte et horizon sont requis.');
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        directionId,
        alignedVisionId: visionId,
        title: title.trim(),
        ambition: ambition.trim(),
        context: context.trim(),
        horizonLabel: resolvedHorizon,
        ownerLabel: undefined,
      });
      toast.success('Schéma directeur créé.');
      router.push(`/strategic-direction-strategy/${created.id}`);
    } catch (e) {
      const msg =
        typeof e === 'object' &&
        e &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Création impossible.';
      toast.error(msg);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Nouveau schéma directeur"
        description="Créez la stratégie d’une direction alignée sur une vision."
        actions={
          <Link
            href="/strategic-direction-strategy"
            className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
          >
            Annuler
          </Link>
        }
      />

      <div className="starium-section mx-auto max-w-2xl space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-[10px]"
            style={{ background: 'var(--brand-gold-050)' }}
          >
            <Compass className="size-[18px] text-[var(--brand-gold-700)]" aria-hidden />
          </div>
          <div>
            <div className="font-bold text-foreground">Identité du schéma</div>
            <div className="text-sm text-muted-foreground">
              Direction, vision alignée et ambition.
            </div>
          </div>
        </div>

        <div className="starium-form space-y-4">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-new-dir">
              Direction <span className="text-destructive">*</span>
            </label>
            <Select
              value={directionId || undefined}
              onValueChange={(v) => setDirectionId(v ?? '')}
            >
              <SelectTrigger id="stg-new-dir" className="min-h-11 w-full">
                <SelectValue placeholder="Choisir une direction" />
              </SelectTrigger>
              <SelectContent>
                {directionOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {displayLabel(d.code, 'Direction')} — {displayLabel(d.name, 'Direction')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-new-vision">
              Vision alignée <span className="text-destructive">*</span>
            </label>
            <Select
              value={visionId || undefined}
              onValueChange={(v) => setAlignedVisionId(v ?? '')}
            >
              <SelectTrigger id="stg-new-vision" className="min-h-11 w-full">
                <SelectValue placeholder="Choisir une vision" />
              </SelectTrigger>
              <SelectContent>
                {(visionsQ.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {displayLabel(v.title, 'Vision')}
                    {v.isActive ? ' (active)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-new-title">
              Titre <span className="text-destructive">*</span>
            </label>
            <Input
              id="stg-new-title"
              className="min-h-11"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                selectedDirection
                  ? `Schéma ${displayLabel(selectedDirection.code, 'Direction')}`
                  : 'Schéma directeur'
              }
            />
          </div>

          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-new-ambition">
              Ambition <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="stg-new-ambition"
              className="min-h-24"
              value={ambition}
              onChange={(e) => setAmbition(e.target.value)}
              placeholder="Où la direction veut être à la fin de l’horizon."
            />
          </div>

          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-new-context">
              Contexte / périmètre <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="stg-new-context"
              className="min-h-20"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ce que la direction porte au quotidien."
            />
          </div>

          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="stg-new-horizon">
              Horizon <span className="text-destructive">*</span>
            </label>
            <Input
              id="stg-new-horizon"
              className="min-h-11"
              value={horizonLabel}
              onChange={(e) => setHorizonLabel(e.target.value)}
              placeholder={
                displayLabel(selectedVision?.horizonLabel, '2026 → 2028')
              }
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Link
              href="/strategic-direction-strategy"
              className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
            >
              Annuler
            </Link>
            <Button
              type="button"
              className="min-h-11"
              disabled={createMutation.isPending}
              onClick={() => void onSubmit()}
            >
              Créer le schéma
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
