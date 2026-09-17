'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import {
  closeComplianceCampaign,
  confirmCampaignEvaluationsImport,
  createComplianceCampaign,
  createComplianceCampaignSnapshot,
  getComplianceCampaign,
  getComplianceCampaignEvaluationsTemplate,
  getComplianceCampaignSnapshot,
  downloadComplianceCampaignSnapshotZip,
  listComplianceCampaigns,
  previewCampaignEvaluationsImport,
  type CampaignEvalImportPreviewApi,
  type ComplianceCampaignStatusApi,
} from '../api/compliance.api';

const STATUS_LABEL: Record<ComplianceCampaignStatusApi, string> = {
  DRAFT: 'Brouillon',
  OPEN: 'Ouverte',
  CLOSED: 'Clôturée',
  ARCHIVED: 'Archivée',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
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

  const [importCampaignId, setImportCampaignId] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [preview, setPreview] = useState<CampaignEvalImportPreviewApi | null>(
    null,
  );
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);
  const [snapshotView, setSnapshotView] = useState<{
    campaignId: string;
    snapshotId: string;
  } | null>(null);

  const listQ = useQuery({
    queryKey: ['compliance', 'campaigns', clientId, frameworkId],
    queryFn: () => listComplianceCampaigns(authFetch, frameworkId),
    enabled: open && Boolean(clientId) && Boolean(frameworkId),
  });

  const detailQ = useQuery({
    queryKey: [
      'compliance',
      'campaign-detail',
      clientId,
      detailCampaignId,
    ],
    queryFn: () => getComplianceCampaign(authFetch, detailCampaignId!),
    enabled: Boolean(detailCampaignId) && Boolean(clientId),
  });

  const snapQ = useQuery({
    queryKey: [
      'compliance',
      'campaign-snapshot',
      clientId,
      snapshotView?.campaignId,
      snapshotView?.snapshotId,
    ],
    queryFn: () =>
      getComplianceCampaignSnapshot(
        authFetch,
        snapshotView!.campaignId,
        snapshotView!.snapshotId,
      ),
    enabled: Boolean(snapshotView) && Boolean(clientId),
  });

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
    if (detailCampaignId) {
      await queryClient.invalidateQueries({
        queryKey: [
          'compliance',
          'campaign-detail',
          clientId,
          detailCampaignId,
        ],
      });
    }
  };

  const startMut = useMutation({
    mutationFn: () =>
      createComplianceCampaign(authFetch, {
        frameworkId,
        openImmediately: true,
        createSnapshot: true,
      }),
    onSuccess: async (camp) => {
      toast.success(
        `Revue démarrée — ${displayLabel(camp.name, 'Campagne')}`,
      );
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMut = useMutation({
    mutationFn: (id: string) =>
      closeComplianceCampaign(authFetch, id, { createSnapshot: true }),
    onSuccess: async (camp) => {
      toast.success('Revue clôturée (instantané créé)');
      const last = camp.snapshots[0];
      if (last) {
        setDetailCampaignId(camp.id);
        setSnapshotView({ campaignId: camp.id, snapshotId: last.id });
      }
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const snapMut = useMutation({
    mutationFn: (campaignId: string) =>
      createComplianceCampaignSnapshot(authFetch, campaignId, {
        label: `Instantané ${new Date().toISOString().slice(0, 16)}`,
      }),
    onSuccess: async (snap, campaignId) => {
      toast.success('Instantané créé');
      setDetailCampaignId(campaignId);
      setSnapshotView({ campaignId, snapshotId: snap.id });
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewMut = useMutation({
    mutationFn: () =>
      previewCampaignEvaluationsImport(
        authFetch,
        importCampaignId!,
        csvContent,
      ),
    onSuccess: (data) => {
      setPreview(data);
      if (data.errorCount > 0) {
        toast.error(`${data.errorCount} ligne(s) en erreur`);
      } else {
        toast.success(`${data.validCount} ligne(s) prêtes`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmMut = useMutation({
    mutationFn: () =>
      confirmCampaignEvaluationsImport(authFetch, importCampaignId!, {
        fingerprint: preview!.fingerprint,
        csvContent,
      }),
    onSuccess: async (data) => {
      toast.success(`${data.imported} évaluation(s) importée(s)`);
      setPreview(null);
      setCsvContent('');
      setImportCampaignId(null);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const templateMut = useMutation({
    mutationFn: () => getComplianceCampaignEvaluationsTemplate(authFetch),
    onSuccess: (data) => {
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportZipMut = useMutation({
    mutationFn: () =>
      downloadComplianceCampaignSnapshotZip(
        authFetch,
        snapshotView!.campaignId,
        snapshotView!.snapshotId,
      ),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dossier d’audit téléchargé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setImportCampaignId(null);
          setPreview(null);
          setCsvContent('');
          setDetailCampaignId(null);
          setSnapshotView(null);
        }
      }}
      title="Lancer une revue"
      description={`Campagne d’audit sur ${frameworkLabel} — fige la version et photographie les évaluations.`}
      icon={ClipboardCheck}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={startMut.isPending}
            onClick={() => startMut.mutate()}
          >
            {startMut.isPending ? 'Création…' : 'Démarrer la revue'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          La revue ouvre une campagne, fige le nom et la version du référentiel,
          et crée un instantané initial. Vous pouvez ensuite importer un CSV
          d’évaluations (atomique) et consulter les instantanés.
        </p>

        <section aria-labelledby="campaigns-list-heading" className="space-y-2">
          <h3 id="campaigns-list-heading" className="text-sm font-semibold">
            Revues de ce référentiel
          </h3>
          {listQ.isLoading ? (
            <LoadingState rows={2} />
          ) : (listQ.data ?? []).length === 0 ? (
            <EmptyState
              title="Aucune revue"
              description="Démarrez une revue pour figer l’état d’évaluation actuel."
            />
          ) : (
            <ul className="space-y-2">
              {(listQ.data ?? []).map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">
                        {displayLabel(c.name, 'Revue')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {displayLabel(c.frozenFrameworkName, 'Référentiel')} (
                        {displayLabel(c.frozenFrameworkVersion, '—')}) ·{' '}
                        {c._count.snapshots} instantané
                        {c._count.snapshots > 1 ? 's' : ''} · ouverte{' '}
                        {formatDate(c.openedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {STATUS_LABEL[c.status]}
                      </Badge>
                      {c._count.snapshots > 0 ||
                      c.status === 'OPEN' ||
                      c.status === 'CLOSED' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11 sm:min-h-9"
                          onClick={() => {
                            setDetailCampaignId(
                              detailCampaignId === c.id ? null : c.id,
                            );
                            setSnapshotView(null);
                          }}
                        >
                          {detailCampaignId === c.id
                            ? 'Masquer'
                            : 'Instantanés'}
                        </Button>
                      ) : null}
                      {c.status === 'OPEN' ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 sm:min-h-9"
                            disabled={snapMut.isPending}
                            onClick={() => snapMut.mutate(c.id)}
                          >
                            Photographier
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 sm:min-h-9"
                            onClick={() => {
                              setImportCampaignId(c.id);
                              setPreview(null);
                            }}
                          >
                            Import CSV
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 sm:min-h-9"
                            disabled={closeMut.isPending}
                            onClick={() => closeMut.mutate(c.id)}
                          >
                            Clôturer
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {detailCampaignId === c.id ? (
                    <div className="space-y-2 border-t border-border/60 pt-2">
                      {detailQ.isLoading ? (
                        <LoadingState rows={1} />
                      ) : (detailQ.data?.snapshots ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Aucun instantané pour cette revue.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {(detailQ.data?.snapshots ?? []).map((s) => (
                            <li
                              key={s.id}
                              className="flex flex-wrap items-center justify-between gap-2"
                            >
                              <span className="text-sm">
                                {displayLabel(s.label, 'Instantané')} ·{' '}
                                {formatDate(s.createdAt)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="min-h-11 sm:min-h-9"
                                onClick={() =>
                                  setSnapshotView({
                                    campaignId: c.id,
                                    snapshotId: s.id,
                                  })
                                }
                              >
                                Consulter
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {snapshotView ? (
          <section
            aria-labelledby="snap-heading"
            className="space-y-2 rounded-lg border border-border/70 p-3"
            aria-live="polite"
          >
            <h3 id="snap-heading" className="text-sm font-semibold">
              Instantané
              {snapQ.data
                ? ` — ${displayLabel(snapQ.data.label, 'sans libellé')}`
                : ''}
            </h3>
            {snapQ.isLoading ? (
              <LoadingState rows={2} />
            ) : snapQ.isError ? (
              <p className="text-sm text-destructive">
                {snapQ.error instanceof Error
                  ? snapQ.error.message
                  : 'Impossible de charger l’instantané.'}
              </p>
            ) : snapQ.data ? (
              <p className="text-sm text-muted-foreground">
                {snapQ.data.payload.totals?.requirementCount ?? 0} exigences ·
                score{' '}
                {snapQ.data.payload.totals?.compliancePercent == null
                  ? 'Non calculable'
                  : `${snapQ.data.payload.totals.compliancePercent} %`}{' '}
                · C {snapQ.data.payload.totals?.compliantCount ?? 0} · P{' '}
                {snapQ.data.payload.totals?.partiallyCompliantCount ?? 0} · É{' '}
                {snapQ.data.payload.totals?.nonCompliantCount ?? 0} · N.É.{' '}
                {snapQ.data.payload.totals?.notAssessedCount ?? 0}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11 sm:min-h-9"
                disabled={!snapQ.data || exportZipMut.isPending}
                onClick={() => exportZipMut.mutate()}
              >
                {exportZipMut.isPending
                  ? 'Préparation…'
                  : 'Télécharger le dossier ZIP'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                onClick={() => setSnapshotView(null)}
              >
                Masquer le détail
              </Button>
            </div>
          </section>
        ) : null}

        {importCampaignId ? (
          <section
            aria-labelledby="import-heading"
            className="space-y-3 rounded-lg border border-border/70 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="import-heading" className="text-sm font-semibold">
                Import CSV d’évaluations
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={templateMut.isPending}
                onClick={() => templateMut.mutate()}
              >
                Télécharger le modèle
              </Button>
            </div>
            <div className="starium-form-field space-y-1">
              <Label htmlFor="csv-eval-import">Contenu CSV</Label>
              <Textarea
                id="csv-eval-import"
                className="min-h-32 font-mono text-xs"
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  setPreview(null);
                }}
                placeholder="code;status;comment;lastAssessmentDate;evidenceNote"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-9"
                disabled={!csvContent.trim() || previewMut.isPending}
                onClick={() => previewMut.mutate()}
              >
                Aperçu
              </Button>
              <Button
                type="button"
                className="min-h-11 sm:min-h-9"
                disabled={
                  !preview ||
                  preview.errorCount > 0 ||
                  preview.validCount === 0 ||
                  confirmMut.isPending
                }
                onClick={() => confirmMut.mutate()}
              >
                Confirmer l’import
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 sm:min-h-9"
                onClick={() => {
                  setImportCampaignId(null);
                  setPreview(null);
                }}
              >
                Annuler
              </Button>
            </div>
            {preview ? (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {preview.validCount} valide(s) · {preview.errorCount} erreur(s)
                sur {preview.totalRows} ligne(s)
              </p>
            ) : null}
            {preview && preview.errorCount > 0 ? (
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {preview.rows
                  .filter((r) => r.error)
                  .slice(0, 20)
                  .map((r) => (
                    <li key={`${r.line}-${r.code}`} className="text-destructive">
                      Ligne {r.line} ({r.code || '—'}) : {r.error}
                    </li>
                  ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </StariumModal>
  );
}
