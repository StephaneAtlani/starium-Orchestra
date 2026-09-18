'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { displayLabel } from '@/lib/display-label';

export function ComplianceEvidenceEditModal({
  open,
  onOpenChange,
  evidenceName,
  evidenceDescription,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidenceName: string;
  evidenceDescription: string | null | undefined;
  pending: boolean;
  onSave: (payload: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState(evidenceName);
  const [description, setDescription] = useState(evidenceDescription ?? '');

  useEffect(() => {
    if (!open) return;
    setName(evidenceName);
    setDescription(evidenceDescription ?? '');
  }, [open, evidenceName, evidenceDescription]);

  const canSave = name.trim().length >= 2;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Modifier la preuve"
      description="Mettez à jour le titre et le détail affichés dans le dossier."
      icon={Pencil}
      size="md"
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
            disabled={!canSave || pending}
            onClick={() =>
              onSave({ name: name.trim(), description: description.trim() })
            }
          >
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ev-edit-name">
            Titre{' '}
            <span className="text-destructive" aria-hidden>
              *
            </span>
          </Label>
          <Input
            id="ev-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            aria-required
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-edit-desc">Détail / observation</Label>
          <Textarea
            id="ev-edit-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="min-h-0"
          />
        </div>
      </div>
    </StariumModal>
  );
}

export function ComplianceEvidenceRemoveModal({
  open,
  onOpenChange,
  evidenceName,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidenceName: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Retirer la preuve"
      description={`Confirmez le retrait de « ${displayLabel(evidenceName, 'cette preuve')} » du dossier courant.`}
      icon={Trash2}
      size="sm"
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
            variant="destructive"
            className="min-h-11 sm:min-h-9"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Retrait…' : 'Retirer'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        La preuve reste historisée (soft-delete) mais ne justifie plus
        l’évaluation.
      </p>
    </StariumModal>
  );
}
