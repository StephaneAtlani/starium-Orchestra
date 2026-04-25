'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { useCreateStrategicAxisMutation } from '../hooks/use-strategic-vision-queries';
import { buildAxisNameWithLogo } from '../lib/strategic-vision-tabs-view';
import {
  STRATEGIC_AXIS_COLOR_OPTIONS,
  STRATEGIC_AXIS_ICONS,
  STRATEGIC_AXIS_ICON_OPTIONS,
  type StrategicAxisIconColor,
  type StrategicAxisIconKey,
  strategicAxisIconColorClass,
} from './strategic-axis-icons';

export function StrategicAxisCreateDialog({
  visionId,
  visionTitle,
  open,
  onOpenChange,
}: {
  visionId: string | null;
  visionTitle: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createAxis = useCreateStrategicAxisMutation();
  const [logo, setLogo] = useState<StrategicAxisIconKey | ''>('');
  const [color, setColor] = useState<StrategicAxisIconColor>('auto');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setLogo('');
    setColor('auto');
    setName('');
    setDescription('');
  };

  const handleSave = async () => {
    if (!visionId) return;
    try {
      await createAxis.mutateAsync({
        visionId,
        name: buildAxisNameWithLogo({ logo, title: name, color }),
        description: description.trim() || undefined,
      });
      toast.success('Axe stratégique créé.');
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Création impossible.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel axe stratégique</DialogTitle>
          <DialogDescription>
            Créez un nouvel axe rattaché à la vision active.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Vision active</span>
            <input
              className="h-9 w-full rounded-md border border-input bg-muted px-3 text-sm"
              value={visionTitle ?? 'Vision non définie'}
              readOnly
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Icône (Lucide)</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={logo}
              onChange={(event) => setLogo(event.target.value as StrategicAxisIconKey | '')}
            >
              <option value="">Aucune icône</option>
              {STRATEGIC_AXIS_ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {logo ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(() => {
                const Icon = STRATEGIC_AXIS_ICONS[logo];
                return <Icon className={`size-4 ${strategicAxisIconColorClass(color)}`} />;
              })()}
              Aperçu icône
            </div>
          ) : null}
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Couleur icône</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={color}
              onChange={(event) => setColor(event.target.value as StrategicAxisIconColor)}
            >
              {STRATEGIC_AXIS_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Nom</span>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Description</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={createAxis.isPending || !visionId || name.trim().length === 0}
          >
            {createAxis.isPending ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
