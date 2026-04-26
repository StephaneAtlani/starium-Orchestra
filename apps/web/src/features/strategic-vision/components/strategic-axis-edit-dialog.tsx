'use client';

import { useEffect, useState } from 'react';
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
import type { StrategicAxisDto } from '../types/strategic-vision.types';
import { useUpdateStrategicAxisMutation } from '../hooks/use-strategic-vision-queries';
import { suggestStrategicAxisIconKeyFromTitle } from '../lib/strategic-axis-icon-suggest-from-title';
import {
  buildAxisNameWithLogo,
  splitAxisLogoAndTitle,
} from '../lib/strategic-vision-tabs-view';
import {
  isStrategicAxisIconKey,
  STRATEGIC_AXIS_COLOR_OPTIONS,
  STRATEGIC_AXIS_ICONS,
  STRATEGIC_AXIS_ICON_OPTIONS,
  type StrategicAxisIconColor,
  type StrategicAxisIconKey,
  strategicAxisIconColorClass,
} from './strategic-axis-icons';

export function StrategicAxisEditDialog({
  axis,
  open,
  onOpenChange,
}: {
  axis: StrategicAxisDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateAxis = useUpdateStrategicAxisMutation();
  const [logo, setLogo] = useState<StrategicAxisIconKey | ''>('');
  const [color, setColor] = useState<StrategicAxisIconColor>('auto');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!axis) return;
    const parsed = splitAxisLogoAndTitle(axis.name);
    setLogo(parsed.logo && isStrategicAxisIconKey(parsed.logo) ? parsed.logo : '');
    setColor(parsed.color);
    setName(parsed.title);
    setDescription(axis.description ?? '');
  }, [axis]);

  const previewIconKey = logo ? logo : suggestStrategicAxisIconKeyFromTitle(name);

  const handleSave = async () => {
    if (!axis) return;
    try {
      await updateAxis.mutateAsync({
        axisId: axis.id,
        body: {
          name: buildAxisNameWithLogo({ logo, title: name, color }),
          description: description.trim() ? description.trim() : null,
        },
      });
      toast.success('Axe stratégique mis à jour.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;axe stratégique</DialogTitle>
          <DialogDescription>
            Mettez à jour le nom et la description de l&apos;axe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
          {previewIconKey ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(() => {
                const Icon = STRATEGIC_AXIS_ICONS[previewIconKey];
                if (!Icon) return null;
                return (
                  <Icon
                    className={`size-4 shrink-0 ${strategicAxisIconColorClass(color)}${logo ? '' : ' opacity-80'}`}
                  />
                );
              })()}
              <span>
                {logo
                  ? 'Aperçu icône'
                  : 'Exemple selon le titre — choisissez une icône pour l’enregistrer'}
              </span>
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
            disabled={updateAxis.isPending || name.trim().length === 0}
          >
            {updateAxis.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
