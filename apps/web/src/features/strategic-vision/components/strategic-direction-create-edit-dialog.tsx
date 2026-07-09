'use client';

import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import {
  useCreateStrategicDirectionMutation,
  useUpdateStrategicDirectionMutation,
} from '../hooks/use-strategic-vision-queries';
import type { StrategicDirectionDto } from '../types/strategic-vision.types';

export function StrategicDirectionCreateEditDialog({
  mode,
  open,
  onOpenChange,
  direction,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: StrategicDirectionDto | null;
  onSuccess?: (direction: StrategicDirectionDto) => void;
}) {
  const createDirection = useCreateStrategicDirectionMutation();
  const updateDirection = useUpdateStrategicDirectionMutation();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && direction) {
      setCode(direction.code);
      setName(direction.name);
      setDescription(direction.description ?? '');
      setIsActive(direction.isActive);
    } else if (mode === 'create') {
      setCode('');
      setName('');
      setDescription('');
      setIsActive(true);
    }
  }, [open, mode, direction]);

  const reset = () => {
    setCode('');
    setName('');
    setDescription('');
    setIsActive(true);
  };

  const handleSubmit = async () => {
    try {
      if (mode === 'create') {
        const created = await createDirection.mutateAsync({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          sortOrder: 0,
          isActive,
        });
        toast.success('Direction créée.');
        onSuccess?.(created);
      } else if (direction) {
        const updated = await updateDirection.mutateAsync({
          directionId: direction.id,
          body: {
            code: code.trim(),
            name: name.trim(),
            description: description.trim() || null,
            sortOrder: direction.sortOrder,
            isActive,
          },
        });
        toast.success('Direction mise à jour.');
        onSuccess?.(updated);
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enregistrement impossible.');
    }
  };

  const pending = createDirection.isPending || updateDirection.isPending;
  const canSubmit = !pending && code.trim().length > 0 && name.trim().length > 0;

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={mode === 'create' ? 'Nouvelle direction' : 'Modifier la direction'}
      description="Code court unique (ex. DSI), libellé affiché partout dans les sélecteurs et tableaux."
      icon={Compass}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="starium-form">
        <h3 className="starium-modal-seg-title">Informations</h3>
        <div className="starium-form-grid starium-form-grid--2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-dir-code">
              Code <span className="text-destructive">*</span>
            </label>
            <input
              id="sv-dir-code"
              className="starium-form-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Ex. DSI"
              disabled={pending}
              maxLength={30}
              autoComplete="off"
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-dir-name">
              Nom <span className="text-destructive">*</span>
            </label>
            <input
              id="sv-dir-name"
              className="starium-form-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nom métier"
              disabled={pending}
              maxLength={255}
            />
          </div>
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-dir-description">
            Description (optionnel)
          </label>
          <textarea
            id="sv-dir-description"
            className="starium-form-textarea min-h-[80px]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={pending}
            maxLength={4000}
          />
        </div>
        <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Ordre d&apos;affichage : automatique (alphabétique).
        </p>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm sm:min-h-9">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={pending}
          />
          Direction active
        </label>
      </div>
    </StariumModal>
  );
}
