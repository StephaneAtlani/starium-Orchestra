'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import {
  listResourceOptions,
  type EffectiveRightsOperation,
  type EffectiveRightsQuery,
  type EffectiveRightsResourceType,
  type ResourceOption,
} from '../api/access-diagnostics';
import { EffectiveRightsMatrix } from './effective-rights-matrix';
import {
  useClientEffectiveRightsDiagnostic,
  usePlatformEffectiveRightsDiagnostic,
} from '../hooks/use-effective-rights-diagnostic';

const RESOURCE_TYPES: EffectiveRightsResourceType[] = [
  'PROJECT',
  'BUDGET',
  'CONTRACT',
  'SUPPLIER',
  'STRATEGIC_OBJECTIVE',
];

const OPERATIONS: EffectiveRightsOperation[] = ['read', 'write', 'admin'];

function resourceTypeLabel(type: EffectiveRightsResourceType): string {
  if (type === 'PROJECT') return 'Projet';
  if (type === 'BUDGET') return 'Budget';
  if (type === 'CONTRACT') return 'Contrat';
  if (type === 'SUPPLIER') return 'Fournisseur';
  return 'Objectif stratégique';
}

export function AccessDiagnosticsPage({
  mode,
  clientId,
}: {
  mode: 'client' | 'platform';
  clientId?: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const clientMutation = useClientEffectiveRightsDiagnostic();
  const platformMutation = usePlatformEffectiveRightsDiagnostic(clientId ?? '');
  const mutation = mode === 'platform' ? platformMutation : clientMutation;

  const [userId, setUserId] = useState('');
  const [resourceType, setResourceType] =
    useState<EffectiveRightsResourceType>('PROJECT');
  const [operation, setOperation] = useState<EffectiveRightsOperation>('read');
  const [resourceSearch, setResourceSearch] = useState('');
  const [options, setOptions] = useState<ResourceOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [selectedOptionLabel, setSelectedOptionLabel] = useState('');
  const [technicalResourceId, setTechnicalResourceId] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);

  const useTechnicalInput = options.length === 0;
  const resourceId = useTechnicalInput ? technicalResourceId : selectedOptionId;
  const resourceLabel = useTechnicalInput
    ? selectedOptionLabel || 'Identifiant technique (non affiché comme libellé principal)'
    : selectedOptionLabel;

  useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    setOptionsError(null);
    setSelectedOptionId('');
    setSelectedOptionLabel('');
    void (async () => {
      try {
        const rows = await listResourceOptions(authFetch, resourceType, resourceSearch);
        if (cancelled) return;
        setOptions(rows);
      } catch (e) {
        if (!cancelled) {
          setOptions([]);
          setOptionsError((e as Error).message);
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, resourceType, resourceSearch]);

  const canSubmit = useMemo(
    () => userId.trim().length > 0 && resourceId.trim().length > 0,
    [resourceId, userId],
  );

  const onSubmit = () => {
    const payload: EffectiveRightsQuery = {
      userId: userId.trim(),
      resourceType,
      resourceId: resourceId.trim(),
      operation,
    };
    mutation.mutate(payload);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Diagnostic des droits effectifs"
        description="Matrice consolidée licence, module, RBAC et ACL pour expliquer un accès autorisé ou refusé."
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="diag-user">Utilisateur (userId technique)</Label>
            <Input
              id="diag-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="cxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="diag-op">Opération</Label>
            <Select value={operation} onValueChange={(v) => setOperation(v as EffectiveRightsOperation)}>
              <SelectTrigger id="diag-op">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATIONS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="diag-type">Type de ressource</Label>
            <Select
              value={resourceType}
              onValueChange={(v) => setResourceType(v as EffectiveRightsResourceType)}
            >
              <SelectTrigger id="diag-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {resourceTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="diag-search">Recherche ressource (libellé métier)</Label>
            <Input
              id="diag-search"
              value={resourceSearch}
              onChange={(e) => setResourceSearch(e.target.value)}
              placeholder="Nom projet, budget, contrat, fournisseur…"
            />
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {loadingOptions ? (
            <p className="text-xs text-muted-foreground">Chargement des ressources…</p>
          ) : null}
          {optionsError ? <p className="text-xs text-destructive">{optionsError}</p> : null}

          {options.length > 0 ? (
            <div className="space-y-1">
              <Label htmlFor="diag-resource-select">Ressource (valeur métier)</Label>
              <Select
                value={selectedOptionId}
                onValueChange={(v) => {
                  setSelectedOptionId(v);
                  setSelectedOptionLabel(
                    options.find((opt) => opt.id === v)?.label ?? '',
                  );
                }}
              >
                <SelectTrigger id="diag-resource-select">
                  <SelectValue placeholder="Sélectionner une ressource" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="diag-resource-id">Ressource (identifiant technique)</Label>
              <Input
                id="diag-resource-id"
                value={technicalResourceId}
                onChange={(e) => setTechnicalResourceId(e.target.value)}
                placeholder="cxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-amber-600">
                Aucun sélecteur métier disponible actuellement pour ce type. Mode
                identifiant technique activé.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={onSubmit} disabled={!canSubmit || mutation.isPending}>
            Lancer le diagnostic
          </Button>
          {mode === 'platform' && clientId ? (
            <span className="text-xs text-muted-foreground">
              Scope plateforme ciblé sur le client sélectionné.
            </span>
          ) : null}
        </div>
      </Card>

      {resourceLabel ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Ressource ciblée: <span className="font-medium text-foreground">{resourceLabel}</span>
        </p>
      ) : null}

      {mutation.isError ? (
        <p className="mb-3 text-sm text-destructive">
          {(mutation.error as Error).message}
        </p>
      ) : null}

      {mutation.data ? <EffectiveRightsMatrix response={mutation.data} /> : null}
    </PageContainer>
  );
}
