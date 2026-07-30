'use client';

import { useId, useState } from 'react';
import {
  VISUAL_ACCENT_TOKENS,
  VISUAL_ICON_KEYS,
  type VisualAccentToken,
  type VisualIconKey,
} from '@starium-orchestra/types';
import { Palette } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { EntityVisualMark } from '@/components/ui/entity-visual-mark';
import { Label } from '@/components/ui/label';
import {
  buildEntityVisualPreview,
  VISUAL_ACCENT_CSS_VARS,
  VISUAL_ACCENT_LABELS,
  VISUAL_SURFACE_CSS_VARS,
  surfaceTokenForAccent,
} from '@/lib/visual-library/visual-token-registry';
import { cn } from '@/lib/utils';

export const VISUAL_ICON_LABELS: Record<VisualIconKey, string> = {
  activity: 'Activité',
  briefcase: 'Portefeuille',
  building: 'Organisation',
  cloud: 'Cloud',
  database: 'Données',
  folder: 'Dossier',
  gitBranch: 'Branche',
  key: 'Accès',
  layers: 'Couches',
  megaphone: 'Communication',
  monitor: 'Écran',
  network: 'Réseau',
  server: 'Serveur',
  shield: 'Sécurité',
  smartphone: 'Mobile',
  users: 'Équipe',
  wallet: 'Budget',
  workflow: 'Processus',
};

export type EntityVisualPickerValue = {
  iconKey: VisualIconKey;
  accentToken: VisualAccentToken;
};

type EntityVisualPickerProps = {
  iconKey?: string | null;
  accentToken?: string | null;
  onChange: (next: EntityVisualPickerValue) => void;
  defaultIconKey?: VisualIconKey;
  defaultAccentToken?: VisualAccentToken;
  id?: string;
  className?: string;
  /** Libellé du groupe (sr / visible). */
  label?: string;
};

function resolvePickerValue(
  iconKey: string | null | undefined,
  accentToken: string | null | undefined,
  defaultIconKey: VisualIconKey,
  defaultAccentToken: VisualAccentToken,
): EntityVisualPickerValue {
  const resolvedIcon = VISUAL_ICON_KEYS.includes(iconKey as VisualIconKey)
    ? (iconKey as VisualIconKey)
    : defaultIconKey;
  const resolvedAccent = VISUAL_ACCENT_TOKENS.includes(accentToken as VisualAccentToken)
    ? (accentToken as VisualAccentToken)
    : defaultAccentToken;
  return { iconKey: resolvedIcon, accentToken: resolvedAccent };
}

/**
 * Sélecteur visuel simple : carré icône + carré couleur, chacun ouvre une modale de choix.
 * Si rien n’est défini, affiche les défauts automatiques.
 */
export function EntityVisualPicker({
  iconKey,
  accentToken,
  onChange,
  defaultIconKey = 'folder',
  defaultAccentToken = 'neutral',
  id,
  className,
  label = 'Identité visuelle',
}: EntityVisualPickerProps) {
  const reactId = useId();
  const baseId = id ?? `entity-visual-${reactId}`;
  const [iconModalOpen, setIconModalOpen] = useState(false);
  const [colorModalOpen, setColorModalOpen] = useState(false);

  const resolved = resolvePickerValue(
    iconKey,
    accentToken,
    defaultIconKey,
    defaultAccentToken,
  );
  const preview = buildEntityVisualPreview(resolved.iconKey, resolved.accentToken);
  const currentSurface = VISUAL_SURFACE_CSS_VARS[surfaceTokenForAccent(resolved.accentToken)];
  const currentColor = VISUAL_ACCENT_CSS_VARS[resolved.accentToken];

  const emit = (nextIcon: VisualIconKey, nextAccent: VisualAccentToken) => {
    onChange({ iconKey: nextIcon, accentToken: nextAccent });
  };

  return (
    <div
      className={cn('space-y-2', className)}
      role="group"
      aria-labelledby={label ? `${baseId}-label` : undefined}
      aria-label={label ? undefined : 'Identité visuelle'}
    >
      {label ? (
        <p id={`${baseId}-label`} className="text-sm font-medium text-foreground">
          {label}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${baseId}-icon`} className="text-xs text-muted-foreground">
            Icône
          </Label>
          <button
            type="button"
            id={`${baseId}-icon`}
            className={cn(
              'inline-flex size-11 items-center justify-center rounded-lg border border-border/70',
              'bg-card transition-colors hover:border-[color:var(--brand-gold)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'min-h-11 min-w-11',
            )}
            aria-haspopup="dialog"
            aria-expanded={iconModalOpen}
            aria-label={`Choisir une icône, actuelle : ${VISUAL_ICON_LABELS[resolved.iconKey]}`}
            onClick={() => setIconModalOpen(true)}
          >
            <EntityVisualMark
              visual={preview}
              size="lg"
              className="size-11 rounded-lg border-0"
              label={VISUAL_ICON_LABELS[resolved.iconKey]}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${baseId}-color`} className="text-xs text-muted-foreground">
            Couleur
          </Label>
          <button
            type="button"
            id={`${baseId}-color`}
            className={cn(
              'inline-flex size-11 items-center justify-center rounded-lg border border-border/70',
              'transition-colors hover:border-[color:var(--brand-gold)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'min-h-11 min-w-11',
            )}
            style={{ backgroundColor: currentSurface }}
            aria-haspopup="dialog"
            aria-expanded={colorModalOpen}
            aria-label={`Choisir une couleur, actuelle : ${VISUAL_ACCENT_LABELS[resolved.accentToken]}`}
            onClick={() => setColorModalOpen(true)}
          >
            <span
              className="block size-5 rounded-full border border-border/40"
              style={{ backgroundColor: currentColor }}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <StariumModal
        open={iconModalOpen}
        onOpenChange={setIconModalOpen}
        title="Choisir une icône"
        description="Sélectionnez l’icône affichée dans les listes et fiches."
        icon={Palette}
        size="md"
        footer={
          <Button type="button" variant="outline" onClick={() => setIconModalOpen(false)}>
            Fermer
          </Button>
        }
      >
        <div
          className="grid grid-cols-4 gap-2 sm:grid-cols-6"
          role="listbox"
          aria-label="Catalogue d’icônes"
        >
          {VISUAL_ICON_KEYS.map((key) => {
            const selected = resolved.iconKey === key;
            const optionVisual = buildEntityVisualPreview(key, resolved.accentToken);
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={VISUAL_ICON_LABELS[key]}
                title={VISUAL_ICON_LABELS[key]}
                className={cn(
                  'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border p-2',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)]'
                    : 'border-border/70 bg-card hover:bg-muted/40',
                )}
                onClick={() => {
                  emit(key, resolved.accentToken);
                  setIconModalOpen(false);
                }}
              >
                <EntityVisualMark
                  visual={optionVisual}
                  size="md"
                  className="border-0"
                  label={VISUAL_ICON_LABELS[key]}
                />
                <span className="max-w-full truncate text-[10px] text-muted-foreground">
                  {VISUAL_ICON_LABELS[key]}
                </span>
              </button>
            );
          })}
        </div>
      </StariumModal>

      <StariumModal
        open={colorModalOpen}
        onOpenChange={setColorModalOpen}
        title="Choisir une couleur"
        description="Sélectionnez le fond / accent affiché dans les listes et fiches."
        icon={Palette}
        size="md"
        footer={
          <Button type="button" variant="outline" onClick={() => setColorModalOpen(false)}>
            Fermer
          </Button>
        }
      >
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          role="listbox"
          aria-label="Catalogue de couleurs"
        >
          {VISUAL_ACCENT_TOKENS.map((accent) => {
            const selected = resolved.accentToken === accent;
            const surface = VISUAL_SURFACE_CSS_VARS[surfaceTokenForAccent(accent)];
            const color = VISUAL_ACCENT_CSS_VARS[accent];
            return (
              <button
                key={accent}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={VISUAL_ACCENT_LABELS[accent]}
                title={VISUAL_ACCENT_LABELS[accent]}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg border p-3',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)]'
                    : 'border-border/70 bg-card hover:bg-muted/40',
                )}
                onClick={() => {
                  emit(resolved.iconKey, accent);
                  setColorModalOpen(false);
                }}
              >
                <span
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60"
                  style={{ backgroundColor: surface }}
                  aria-hidden
                >
                  <span
                    className="block size-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </span>
                <span className="text-sm text-foreground">{VISUAL_ACCENT_LABELS[accent]}</span>
              </button>
            );
          })}
        </div>
      </StariumModal>
    </div>
  );
}
