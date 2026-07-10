'use client';

import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import { useCreateStrategicObjectiveMutation } from '../hooks/use-strategic-vision-queries';
import type { StrategicObjectiveStatus } from '../types/strategic-vision.types';
import { STRATEGIC_OBJECTIVE_STATUS_OPTIONS } from '../lib/strategic-vision-labels';
import {
  getFirstZodError,
  strategicObjectiveFormSchema,
} from '../schemas/strategic-vision.schemas';
import { OwnerOrgUnitSelect } from '@/features/organization/components/owner-org-unit-select';
import { OwnerOrgUnitNullWarning } from '@/features/organization/components/owner-org-unit-null-warning';

type AxisOption = { id: string; name: string };

export function StrategicObjectiveCreateDialog({
  open,
  onOpenChange,
  axisOptions,
  directionOptions,
  initialAxisId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  axisOptions: AxisOption[];
  directionOptions: Array<{ id: string; label: string }>;
  initialAxisId?: string | null;
}) {
  const createObjective = useCreateStrategicObjectiveMutation();
  const [axisId, setAxisId] = useState(initialAxisId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [status, setStatus] = useState<StrategicObjectiveStatus>('ON_TRACK');
  const [deadline, setDeadline] = useState('');
  const [directionId, setDirectionId] = useState<string>('UNASSIGNED');
  const [ownerOrgUnitId, setOwnerOrgUnitId] = useState<string | null>(null);

  const effectiveAxisId = useMemo(() => {
    if (axisId) return axisId;
    if (initialAxisId) return initialAxisId;
    return axisOptions[0]?.id ?? '';
  }, [axisId, initialAxisId, axisOptions]);

  const reset = () => {
    setAxisId(initialAxisId ?? '');
    setTitle('');
    setDescription('');
    setOwnerLabel('');
    setStatus('ON_TRACK');
    setDeadline('');
    setDirectionId('UNASSIGNED');
    setOwnerOrgUnitId(null);
  };

  const handleCreate = async () => {
    if (!effectiveAxisId || !title.trim()) return;
    const parsed = strategicObjectiveFormSchema.safeParse({
      axisId: effectiveAxisId,
      title,
      description,
      ownerLabel,
      status,
      deadline,
      directionId,
      ownerOrgUnitId,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      await createObjective.mutateAsync({
        axisId: parsed.data.axisId,
        title: parsed.data.title,
        description: parsed.data.description || undefined,
        ownerLabel: parsed.data.ownerLabel || undefined,
        status: parsed.data.status,
        deadline: parsed.data.deadline || undefined,
        directionId: parsed.data.directionId === 'UNASSIGNED' ? null : parsed.data.directionId,
        ownerOrgUnitId: parsed.data.ownerOrgUnitId ?? null,
      });
      toast.success('Objectif stratégique créé.');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Création impossible.');
    }
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Nouvel objectif stratégique"
      description="Rattachez l'objectif à un axe et définissez son pilotage."
      icon={Target}
      accent="violet"
      size="lg"
      footer={
        <>
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
            className="min-h-11 sm:min-h-9"
            disabled={createObjective.isPending || !effectiveAxisId || title.trim().length === 0}
            onClick={() => void handleCreate()}
          >
            {createObjective.isPending ? 'Création…' : 'Créer'}
          </Button>
        </>
      }
    >
      <div className="starium-form">
        <h3 className="starium-modal-seg-title">Informations</h3>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-obj-create-axis">
            Axe
          </label>
          <select
            id="sv-obj-create-axis"
            className="starium-form-select"
            value={effectiveAxisId}
            onChange={(event) => setAxisId(event.target.value)}
          >
            {axisOptions.map((axis) => (
              <option key={axis.id} value={axis.id}>
                {axis.name}
              </option>
            ))}
          </select>
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-obj-create-title">
            Titre <span className="text-destructive">*</span>
          </label>
          <input
            id="sv-obj-create-title"
            className="starium-form-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-obj-create-description">
            Description
          </label>
          <textarea
            id="sv-obj-create-description"
            className="starium-form-textarea min-h-[84px]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-obj-create-owner">
            Responsable
          </label>
          <input
            id="sv-obj-create-owner"
            className="starium-form-input"
            value={ownerLabel}
            onChange={(event) => setOwnerLabel(event.target.value)}
          />
        </div>
        <div className="starium-form-grid starium-form-grid--2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-obj-create-status">
              Statut initial
            </label>
            <select
              id="sv-obj-create-status"
              className="starium-form-select"
              value={status}
              onChange={(event) => setStatus(event.target.value as StrategicObjectiveStatus)}
            >
              {STRATEGIC_OBJECTIVE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-obj-create-deadline">
              Échéance
            </label>
            <input
              id="sv-obj-create-deadline"
              type="date"
              className="starium-form-input"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </div>
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-obj-create-direction">
            Direction stratégique
          </label>
          <select
            id="sv-obj-create-direction"
            className="starium-form-select"
            value={directionId}
            onChange={(event) => setDirectionId(event.target.value)}
          >
            <option value="UNASSIGNED">Non affecté</option>
            {directionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="starium-form-field">
          <span className="starium-form-label">Direction propriétaire</span>
          <OwnerOrgUnitSelect value={ownerOrgUnitId} onChange={setOwnerOrgUnitId} />
          {!ownerOrgUnitId ? <OwnerOrgUnitNullWarning className="mt-2" /> : null}
        </div>
      </div>
    </StariumModal>
  );
}
