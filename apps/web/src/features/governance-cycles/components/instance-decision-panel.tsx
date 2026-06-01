'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/lib/toast';
import {
  getApiErrorMessage,
  usePatchInstanceDecisionsMutation,
  useReplaceInstanceAgendaMutation,
} from '../api/governance-cycle-instances.queries';
import type { GovernanceCycleInstanceDetailDto } from '../types/governance-cycle-instance.types';
import type { GovernanceCycleItemDecisionStatus } from '../types/governance-cycle.types';

export function InstanceDecisionPanel({
  cycleId,
  instance,
  itemOptions,
  canUpdate,
  canArbitrate,
  finalDecisionOptions,
  onOpen,
  onClose,
  getDecisionLabel,
}: {
  cycleId: string;
  instance: GovernanceCycleInstanceDetailDto;
  itemOptions: Array<{ id: string; label: string }>;
  canUpdate: boolean;
  canArbitrate: boolean;
  finalDecisionOptions: Array<{ value: string; label: string }>;
  onOpen: () => Promise<void>;
  onClose: () => Promise<void>;
  getDecisionLabel: (s: GovernanceCycleItemDecisionStatus) => string;
}) {
  const [agendaSelection, setAgendaSelection] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<
    Record<string, { status: string; reason?: string }>
  >({});

  const replaceAgenda = useReplaceInstanceAgendaMutation(cycleId, instance.id);
  const patchDecisions = usePatchInstanceDecisionsMutation(cycleId, instance.id);

  useEffect(() => {
    setAgendaSelection(instance.agenda.map((a) => a.itemId));
    const map: Record<string, { status: string; reason?: string }> = {};
    for (const d of instance.decisions) {
      map[d.itemId] = { status: d.decisionStatus, reason: d.decisionReason ?? undefined };
    }
    for (const a of instance.agenda) {
      if (!map[a.itemId]) {
        map[a.itemId] = { status: a.item.decisionStatus };
      }
    }
    setDecisions(map);
  }, [instance]);

  async function saveAgenda() {
    try {
      await replaceAgenda.mutateAsync(agendaSelection);
      toast.success('Ordre du jour enregistré');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }

  async function saveDecisions() {
    const payload = agendaSelection
      .filter((itemId) => decisions[itemId]?.status)
      .map((itemId) => ({
        itemId,
        decisionStatus: decisions[itemId].status,
        decisionReason: decisions[itemId].reason ?? null,
      }));
    if (payload.length === 0) {
      toast.error('Aucune décision à enregistrer');
      return;
    }
    try {
      await patchDecisions.mutateAsync(payload);
      toast.success('Décisions enregistrées');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">{instance.periodLabel ?? 'Séance'}</h3>
        <p className="text-xs text-muted-foreground">Statut : {instance.status}</p>
      </div>

      {canUpdate && (instance.status === 'DRAFT' || instance.status === 'PLANNED' || instance.status === 'OPEN') ? (
        <div className="space-y-2">
          <Label>Ordre du jour</Label>
          <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
            {itemOptions.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={agendaSelection.includes(opt.id)}
                  onCheckedChange={(checked) => {
                    setAgendaSelection((prev) =>
                      checked ? [...prev, opt.id] : prev.filter((id) => id !== opt.id),
                    );
                  }}
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={saveAgenda} disabled={replaceAgenda.isPending}>
            Enregistrer l&apos;agenda
          </Button>
        </div>
      ) : null}

      {instance.status === 'PLANNED' && canUpdate ? (
        <Button size="sm" onClick={onOpen}>
          Ouvrir la séance
        </Button>
      ) : null}

      {instance.status === 'OPEN' && canArbitrate ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Décisions (séance ouverte)</p>
          {agendaSelection.map((itemId) => {
            const opt = itemOptions.find((o) => o.id === itemId);
            return (
              <div key={itemId} className="grid gap-2 sm:grid-cols-2 items-end">
                <p className="text-sm truncate sm:col-span-2">{opt?.label ?? itemId}</p>
                <Select
                  value={decisions[itemId]?.status ?? ''}
                  onValueChange={(v) => {
                    if (!v) return;
                    setDecisions((d) => ({ ...d, [itemId]: { ...d[itemId], status: v } }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Décision" />
                  </SelectTrigger>
                  <SelectContent>
                    {finalDecisionOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={saveDecisions} disabled={patchDecisions.isPending}>
              Enregistrer les décisions
            </Button>
            <Button size="sm" onClick={onClose}>
              Clôturer la séance
            </Button>
          </div>
        </div>
      ) : null}

      {instance.status === 'CLOSED' ? (
        <ul className="text-sm space-y-1">
          {instance.decisions.map((d) => {
            const item = instance.agenda.find((a) => a.itemId === d.itemId)?.item;
            return (
              <li key={d.id}>
                {item?.title ?? d.itemId} :{' '}
                {getDecisionLabel(d.decisionStatus as GovernanceCycleItemDecisionStatus)}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
