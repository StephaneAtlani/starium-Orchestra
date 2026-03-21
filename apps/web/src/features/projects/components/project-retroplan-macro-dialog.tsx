'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { createRetroplanMacro } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

type StepRow = { name: string; daysBeforeEnd: string };

const DEFAULT_STEPS: StepRow[] = [
  { name: 'Livraison / mise en production', daysBeforeEnd: '0' },
  { name: 'Recette utilisateur', daysBeforeEnd: '21' },
  { name: 'Cadrage validé', daysBeforeEnd: '60' },
];

function isoDateFromProject(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Même logique que l’API (date-only → UTC midi, − n jours calendaires). */
function formatComputedTargetDate(
  anchorEndDate: string,
  daysBeforeEndStr: string,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorEndDate.trim())) return null;
  const raw = String(daysBeforeEndStr).trim();
  if (raw === '') return null;
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchorEndDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const anchor = new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
  const target = new Date(anchor.getTime() - n * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(target);
}

export function ProjectRetroplanMacroDialog({
  projectId,
  defaultAnchorDate,
  open,
  onOpenChange,
}: {
  projectId: string;
  defaultAnchorDate: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const [anchorEndDate, setAnchorEndDate] = useState('');
  const [steps, setSteps] = useState<StepRow[]>(DEFAULT_STEPS);

  useEffect(() => {
    if (!open) return;
    const fromProject = isoDateFromProject(defaultAnchorDate ?? null);
    setAnchorEndDate(fromProject || todayIsoDate());
    setSteps(DEFAULT_STEPS.map((s) => ({ ...s })));
  }, [open, defaultAnchorDate]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed: { name: string; daysBeforeEnd: number }[] = [];
      for (const s of steps) {
        const name = s.name.trim();
        if (!name) {
          throw new Error('Chaque étape doit avoir un libellé.');
        }
        const rawDays = String(s.daysBeforeEnd).trim();
        if (rawDays === '') {
          throw new Error(`« ${name} » : renseignez le nombre de jours avant la fin.`);
        }
        const n = Number(rawDays.replace(',', '.'));
        if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
          throw new Error(
            `« ${name} » : indiquez un nombre entier de jours avant la fin (≥ 0).`,
          );
        }
        parsed.push({ name, daysBeforeEnd: n });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorEndDate.trim())) {
        throw new Error('Date de fin invalide (YYYY-MM-DD).');
      }
      return createRetroplanMacro(authFetch, projectId, {
        anchorEndDate: anchorEndDate.trim(),
        steps: parsed,
      });
    },
    onSuccess: (created) => {
      toast.success(
        created.length === 1
          ? '1 jalon créé depuis le rétroplanning macro.'
          : `${created.length} jalons créés depuis le rétroplanning macro.`,
      );
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.milestones(clientId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Erreur à la création');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Rétroplanning macro</DialogTitle>
          <DialogDescription>
            Définissez une <strong>date de fin</strong> (livraison cible), puis des étapes avec
            leur <strong>écart en jours avant cette fin</strong>. Chaque étape devient un jalon
            planifié — du plus proche de la fin au plus éloigné.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="retro-anchor">Date de fin (ancrage)</Label>
            <Input
              id="retro-anchor"
              type="date"
              value={anchorEndDate}
              onChange={(e) => setAnchorEndDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Par défaut : échéance cible du projet si renseignée.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Étapes (macro)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setSteps((prev) => [...prev, { name: '', daysBeforeEnd: '14' }])}
              >
                <Plus className="mr-1 size-3.5" />
                Étape
              </Button>
            </div>
            <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
              {steps.map((row, i) => {
                const computedDate = formatComputedTargetDate(anchorEndDate, row.daysBeforeEnd);
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-border/50 bg-muted/15 p-2 sm:border-0 sm:bg-transparent sm:p-0"
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="text-[10px] uppercase text-muted-foreground">Libellé</span>
                        <Input
                          value={row.name}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSteps((prev) => {
                              const next = [...prev];
                              next[i] = { ...next[i], name: v };
                              return next;
                            });
                          }}
                          placeholder="Ex. Recette"
                          maxLength={500}
                        />
                      </div>
                      <div className="w-full space-y-1 sm:w-28">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          J. avant fin
                        </span>
                        <Input
                          inputMode="numeric"
                          value={row.daysBeforeEnd}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSteps((prev) => {
                              const next = [...prev];
                              next[i] = { ...next[i], daysBeforeEnd: v };
                              return next;
                            });
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="w-full min-w-0 space-y-1 sm:w-[9.5rem]">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          Date cible
                        </span>
                        <div
                          className="flex h-9 items-center rounded-md border border-transparent bg-background/80 px-2.5 text-sm tabular-nums text-foreground sm:border-input sm:bg-background"
                          title="Calcul : date de fin − jours avant fin"
                        >
                          {computedDate ?? '—'}
                        </div>
                      </div>
                      {steps.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Supprimer l’étape ${i + 1}`}
                          onClick={() =>
                            setSteps((prev) =>
                              prev.length <= 1 ? prev : prev.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Création…' : 'Créer les jalons'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
