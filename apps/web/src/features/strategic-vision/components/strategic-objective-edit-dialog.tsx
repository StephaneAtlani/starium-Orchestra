'use client';

import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import type {
  StrategicObjectiveDto,
  StrategicObjectiveStatus,
} from '../types/strategic-vision.types';
import { useUpdateStrategicObjectiveMutation } from '../hooks/use-strategic-vision-queries';
import { STRATEGIC_OBJECTIVE_STATUS_OPTIONS } from '../lib/strategic-vision-labels';
import {
  getFirstZodError,
  strategicObjectiveFormSchema,
} from '../schemas/strategic-vision.schemas';
import { OwnerOrgUnitSelect } from '@/features/organization/components/owner-org-unit-select';
import { OwnerOrgUnitNullWarning } from '@/features/organization/components/owner-org-unit-null-warning';

export function StrategicObjectiveEditDialog({
  objective,
  open,
  onOpenChange,
  directionOptions,
}: {
  objective: StrategicObjectiveDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directionOptions: Array<{ id: string; label: string }>;
}) {
  const updateObjective = useUpdateStrategicObjectiveMutation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [status, setStatus] = useState<StrategicObjectiveStatus>('ON_TRACK');
  const [deadline, setDeadline] = useState('');
  const [directionId, setDirectionId] = useState<string>('UNASSIGNED');
  const [ownerOrgUnitId, setOwnerOrgUnitId] = useState<string | null>(null);

  useEffect(() => {
    if (!objective) return;
    setTitle(objective.title);
    setDescription(objective.description ?? '');
    setOwnerLabel(objective.ownerLabel ?? '');
    setStatus(objective.status);
    setDeadline(objective.deadline ? objective.deadline.slice(0, 10) : '');
    setDirectionId(objective.directionId ?? 'UNASSIGNED');
    setOwnerOrgUnitId(objective.ownerOrgUnitId ?? null);
  }, [objective]);

  const handleSave = async () => {
    if (!objective) return;
    const parsed = strategicObjectiveFormSchema.safeParse({
      axisId: objective.axisId,
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
      await updateObjective.mutateAsync({
        objectiveId: objective.id,
        body: {
          title: parsed.data.title,
          description: parsed.data.description?.trim() ? parsed.data.description : null,
          ownerLabel: parsed.data.ownerLabel?.trim() ? parsed.data.ownerLabel : null,
          status: parsed.data.status,
          deadline: parsed.data.deadline ? `${parsed.data.deadline}T00:00:00.000Z` : null,
          directionId:
            parsed.data.directionId === 'UNASSIGNED' ? null : parsed.data.directionId,
          ownerOrgUnitId: parsed.data.ownerOrgUnitId ?? null,
        },
      });
      toast.success('Objectif stratégique mis à jour.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible.');
    }
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Modifier l'objectif"
      description={objective?.title ?? 'Mise à jour des informations de pilotage.'}
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
            disabled={updateObjective.isPending || title.trim().length === 0}
            onClick={() => void handleSave()}
          >
            {updateObjective.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="starium-form">
        <h3 className="starium-modal-seg-title">Informations</h3>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-obj-edit-title">
            Titre <span className="text-destructive">*</span>
          </label>
          <input
            id="sv-obj-edit-title"
            className="starium-form-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-obj-edit-description">
            Description
          </label>
          <textarea
            id="sv-obj-edit-description"
            className="starium-form-textarea min-h-[100px]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="starium-form-grid starium-form-grid--2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-obj-edit-owner">
              Responsable
            </label>
            <input
              id="sv-obj-edit-owner"
              className="starium-form-input"
              value={ownerLabel}
              onChange={(event) => setOwnerLabel(event.target.value)}
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-obj-edit-status">
              Statut
            </label>
            <select
              id="sv-obj-edit-status"
              className="starium-form-select"
              value={status}
              onChange={(event) => setStatus(event.target.value as StrategicObjectiveStatus)}
            >
              {STRATEGIC_OBJECTIVE_STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-obj-edit-deadline">
            Échéance
          </label>
          <input
            id="sv-obj-edit-deadline"
            type="date"
            className="starium-form-input"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-obj-edit-direction">
            Direction stratégique
          </label>
          <select
            id="sv-obj-edit-direction"
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
