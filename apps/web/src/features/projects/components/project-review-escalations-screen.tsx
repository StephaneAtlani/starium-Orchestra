'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewEscalationApi,
} from '../types/project.types';

function formatDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Props = {
  reviewTitle: string | null;
  reviewDate: string | null;
  agendaItems: ProjectReviewAgendaItemApi[];
  escalations: ProjectReviewEscalationApi[] | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  canEdit: boolean;
  creating: boolean;
  cancellingId: string | null;
  onCreate: (sourceAgendaItemId: string) => Promise<void>;
  onCancel: (escalationId: string) => Promise<void>;
};

export function ProjectReviewEscalationsScreen({
  reviewTitle,
  reviewDate,
  agendaItems,
  escalations,
  loading,
  error,
  onRetry,
  canEdit,
  creating,
  cancellingId,
  onCreate,
  onCancel,
}: Props) {
  const [selectedAgendaId, setSelectedAgendaId] = useState<string>('');

  const activeEscalations = useMemo(
    () => (escalations ?? []).filter((e) => e.status !== 'CANCELLED'),
    [escalations],
  );
  const pendingCount = activeEscalations.filter((e) => e.status === 'PENDING')
    .length;
  const usedAgendaIds = useMemo(
    () =>
      new Set(
        activeEscalations
          .map((e) => e.sourceAgendaItemId)
          .filter((id): id is string => Boolean(id)),
      ),
    [activeEscalations],
  );

  const agendaOptions = useMemo(
    () =>
      agendaItems.filter(
        (item) =>
          item.itemType !== 'ESCALATION' && !usedAgendaIds.has(item.id),
      ),
    [agendaItems, usedAgendaIds],
  );

  const sessionLabel = firstDisplayLabel(
    [reviewTitle, 'COPROJ'],
    'COPROJ',
  );
  const sessionDateLabel = formatDateLabel(reviewDate);

  return (
    <section
      className="mb-3 shrink-0 space-y-3 rounded-xl border border-border/70 bg-card p-3 sm:p-4"
      aria-labelledby="escalations-screen-title"
    >
      <div className="space-y-1">
        <h2
          id="escalations-screen-title"
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <ArrowUpRight
            className="size-4 shrink-0 text-[color:var(--brand-gold)]"
            aria-hidden
          />
          Sujets à remonter
        </h2>
        <p className="text-sm text-muted-foreground">
          Qualifiez les sujets qui alimentent l’ordre du jour du prochain COPIL.
          Contexte conservé : séance, date, point d’origine, porteur.
        </p>
      </div>

      {pendingCount > 0 ? (
        <Alert className="border-[color:var(--state-warning)]/50 bg-[color:var(--state-warning-bg)]">
          <AlertTriangle
            className="size-4 text-[color:var(--state-warning)]"
            aria-hidden
          />
          <AlertTitle>Remontées en attente</AlertTitle>
          <AlertDescription>
            {pendingCount} sujet{pendingCount > 1 ? 's' : ''} en attente du
            prochain COPIL (finalisation non bloquée).
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <LoadingState rows={3} />
      ) : error ? (
        <ErrorState
          message="Impossible de charger les remontées"
          onRetry={onRetry}
        />
      ) : activeEscalations.length === 0 ? (
        <EmptyState
          title="Aucun sujet à remonter"
          description="Sélectionnez un point d’ordre du jour pour le faire remonter au COPIL."
        />
      ) : (
        <ul className="space-y-2" aria-label="Liste des sujets à remonter">
          {activeEscalations.map((esc) => {
            const origin = displayLabel(
              esc.sourceAgendaTitle,
              'Point d’origine non renseigné',
            );
            const owner = displayLabel(
              esc.ownerDisplayName,
              'Porteur non assigné',
            );
            const target =
              esc.targetReviewTitle != null
                ? `${esc.targetReviewTitle}${
                    formatDateLabel(esc.targetReviewDate)
                      ? ` · ${formatDateLabel(esc.targetReviewDate)}`
                      : ''
                  }`
                : 'En attente du prochain COPIL';
            return (
              <li
                key={esc.id}
                className="rounded-lg border border-border/60 bg-background/60 p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-foreground">
                      {displayLabel(esc.title, 'Sujet sans titre')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Origine : {origin}
                      {' · '}
                      Séance : {sessionLabel}
                      {sessionDateLabel ? ` (${sessionDateLabel})` : ''}
                      {' · '}
                      Porteur : {owner}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cible : {target}
                      {' · '}
                      {displayLabel(esc.statusLabel, 'Statut inconnu')}
                    </p>
                  </div>
                  {canEdit && esc.status !== 'CANCELLED' ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 shrink-0"
                      disabled={cancellingId === esc.id}
                      onClick={() => void onCancel(esc.id)}
                    >
                      {cancellingId === esc.id ? 'Annulation…' : 'Retirer'}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <Label htmlFor="escalation-agenda-select" className="text-sm font-medium">
            Ajouter un sujet depuis l’ordre du jour
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Select
              value={selectedAgendaId || undefined}
              onValueChange={(v) => setSelectedAgendaId(v ?? '')}
              disabled={creating || agendaOptions.length === 0}
            >
              <SelectTrigger
                id="escalation-agenda-select"
                className="min-h-11 w-full flex-1"
              >
                <SelectValue placeholder="Choisir un point d’ordre du jour" />
              </SelectTrigger>
              <SelectContent>
                {agendaOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {displayLabel(item.title, 'Point sans titre')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              className="min-h-11 shrink-0"
              disabled={!selectedAgendaId || creating}
              onClick={async () => {
                if (!selectedAgendaId) return;
                await onCreate(selectedAgendaId);
                setSelectedAgendaId('');
              }}
            >
              <Plus className="size-4" aria-hidden />
              {creating ? 'Ajout…' : 'Remonter'}
            </Button>
          </div>
          {agendaOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Tous les points éligibles sont déjà remontés, ou l’ordre du jour
              est vide.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
