'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
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
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  postProjectArbitration,
  updateProjectSheet,
} from '../api/projects.api';
import { projectDetail, projectsList } from '../constants/project-routes';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import type {
  ProjectArbitrationStatus,
  ProjectSheetRiskLevel,
  UpdateProjectSheetPayload,
} from '../types/project.types';

const RISK_LABEL: Record<ProjectSheetRiskLevel, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
};

const ARBITRATION_LABEL: Record<ProjectArbitrationStatus, string> = {
  DRAFT: 'Brouillon',
  TO_REVIEW: 'À revue CODIR',
  VALIDATED: 'Validé',
  REJECTED: 'Refusé',
};

function numOrUndef(s: string): number | undefined {
  if (s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function ProjectSheetView({ projectId }: { projectId: string }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const { data: sheet, isLoading, error } = useProjectSheetQuery(projectId);

  const [bv, setBv] = useState('');
  const [sa, setSa] = useState('');
  const [us, setUs] = useState('');
  const [cost, setCost] = useState('');
  const [gain, setGain] = useState('');
  const [risk, setRisk] = useState<ProjectSheetRiskLevel | ''>('');
  const [arbDraft, setArbDraft] = useState<ProjectArbitrationStatus | ''>('');

  useEffect(() => {
    if (!sheet) return;
    setBv(sheet.businessValueScore != null ? String(sheet.businessValueScore) : '');
    setSa(sheet.strategicAlignment != null ? String(sheet.strategicAlignment) : '');
    setUs(sheet.urgencyScore != null ? String(sheet.urgencyScore) : '');
    setCost(sheet.estimatedCost != null ? String(sheet.estimatedCost) : '');
    setGain(sheet.estimatedGain != null ? String(sheet.estimatedGain) : '');
    setRisk(sheet.riskLevel ?? '');
    setArbDraft(sheet.arbitrationStatus ?? 'DRAFT');
  }, [sheet]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: UpdateProjectSheetPayload = {};
      const nBv = numOrUndef(bv);
      const nSa = numOrUndef(sa);
      const nUs = numOrUndef(us);
      const nCost = numOrUndef(cost);
      const nGain = numOrUndef(gain);
      if (nBv !== undefined) payload.businessValueScore = nBv;
      if (nSa !== undefined) payload.strategicAlignment = nSa;
      if (nUs !== undefined) payload.urgencyScore = nUs;
      if (nCost !== undefined) payload.estimatedCost = nCost;
      if (nGain !== undefined) payload.estimatedGain = nGain;
      if (risk) payload.riskLevel = risk;
      return updateProjectSheet(authFetch, projectId, payload);
    },
    onSuccess: () => {
      toast.success('Fiche mise à jour');
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.sheet(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erreur enregistrement');
    },
  });

  const arbitrationMutation = useMutation({
    mutationFn: (status: ProjectArbitrationStatus) =>
      postProjectArbitration(authFetch, projectId, status),
    onSuccess: () => {
      toast.success('Statut d’arbitrage mis à jour');
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.sheet(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erreur arbitrage');
    },
  });

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  if (isLoading) {
    return <LoadingState rows={6} />;
  }

  if (error || !sheet) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Fiche introuvable ou accès refusé.
      </div>
    );
  }

  const fmt = (n: number | null) =>
    n == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Link
            href={projectsList()}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Portefeuille
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            href={projectDetail(projectId)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Projet
          </Link>
        </div>
        <PageHeader
          title={sheet.name}
          description="Fiche projet décisionnelle (valeur, coût, ROI, risque, priorité)"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROI</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {fmt(sheet.roi)}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Score priorité
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {fmt(sheet.priorityScore)}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risque</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-medium">
            {sheet.riskLevel ? RISK_LABEL[sheet.riskLevel] : '—'}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Arbitrage</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-medium">
            {sheet.arbitrationStatus
              ? ARBITRATION_LABEL[sheet.arbitrationStatus]
              : '—'}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutDashboard className="size-4" />
              Paramètres de la fiche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bv">Valeur métier (1–5)</Label>
                <Input
                  id="bv"
                  type="number"
                  min={1}
                  max={5}
                  disabled={!canEdit}
                  value={bv}
                  onChange={(e) => setBv(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa">Alignement stratégique (1–5)</Label>
                <Input
                  id="sa"
                  type="number"
                  min={1}
                  max={5}
                  disabled={!canEdit}
                  value={sa}
                  onChange={(e) => setSa(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="us">Urgence (1–5)</Label>
                <Input
                  id="us"
                  type="number"
                  min={1}
                  max={5}
                  disabled={!canEdit}
                  value={us}
                  onChange={(e) => setUs(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cost">Coût estimé</Label>
                <Input
                  id="cost"
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={!canEdit}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gain">Gain estimé</Label>
                <Input
                  id="gain"
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={!canEdit}
                  value={gain}
                  onChange={(e) => setGain(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Niveau de risque</Label>
              <Select
                value={risk || undefined}
                onValueChange={(v) => setRisk(v as ProjectSheetRiskLevel)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RISK_LABEL) as ProjectSheetRiskLevel[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {RISK_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canEdit && (
              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer la fiche'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">Statut d’arbitrage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="arb">Nouveau statut</Label>
              <Select
                value={arbDraft || undefined}
                onValueChange={(v) => setArbDraft(v as ProjectArbitrationStatus)}
                disabled={!canEdit}
              >
                <SelectTrigger id="arb">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ARBITRATION_LABEL) as ProjectArbitrationStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {ARBITRATION_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canEdit && arbDraft && (
              <Button
                type="button"
                variant="secondary"
                disabled={arbitrationMutation.isPending}
                onClick={() => arbitrationMutation.mutate(arbDraft)}
              >
                {arbitrationMutation.isPending ? 'Application…' : 'Appliquer le statut'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
