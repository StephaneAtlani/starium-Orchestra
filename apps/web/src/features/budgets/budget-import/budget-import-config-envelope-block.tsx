'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BudgetEnvelope } from '../types/budget-management.types';
import { EMPTY_SELECT_VALUE } from './budget-import-field-labels';
import { BudgetImportColSelect } from './budget-import-column-selects';
import type { BudgetImportOptionsConfig, MappingConfig } from '../types/budget-imports.types';
import type { EnvelopeImportMode } from './budget-import-mapping-validation';

const ENVELOPE_MODE_LABELS: Record<EnvelopeImportMode, string> = {
  from_file_columns: 'Colonne du fichier (code ou ID enveloppe par ligne)',
  single_envelope: 'Une seule enveloppe pour tout le fichier',
};

function envelopeLabel(e: BudgetEnvelope): string {
  if (e.code?.trim() && e.name?.trim()) {
    return `${e.code} — ${e.name}`;
  }
  return e.name?.trim() || e.code?.trim() || 'Enveloppe';
}

export interface BudgetImportConfigEnvelopeBlockProps {
  columns: string[];
  envelopes: BudgetEnvelope[];
  mapping: MappingConfig;
  options: BudgetImportOptionsConfig;
  envelopeImportMode: EnvelopeImportMode;
  onMappingChange: (m: MappingConfig) => void;
  onOptionsChange: (o: BudgetImportOptionsConfig) => void;
  onEnvelopeImportModeChange: (mode: EnvelopeImportMode) => void;
  onCreateEnvelope: (input: {
    name: string;
    code?: string;
    description?: string;
    type: string;
  }) => Promise<BudgetEnvelope>;
}

export function BudgetImportConfigEnvelopeBlock({
  columns,
  envelopes,
  mapping,
  options,
  envelopeImportMode,
  onMappingChange,
  onOptionsChange,
  onEnvelopeImportModeChange,
  onCreateEnvelope,
}: BudgetImportConfigEnvelopeBlockProps) {
  const fields = mapping.fields ?? {};
  const [modalOpen, setModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createType, setCreateType] = useState('RUN');

  const setField = (key: string, column: string) => {
    const next = { ...fields, [key]: column };
    if (!column) delete next[key];
    onMappingChange({ ...mapping, fields: next });
  };

  const enveloppeParDefautValue = options.defaultEnvelopeId ?? EMPTY_SELECT_VALUE;
  const libelleEnveloppeParDefaut =
    enveloppeParDefautValue === EMPTY_SELECT_VALUE
      ? 'Aucune'
      : (() => {
          const ev = envelopes.find((e) => e.id === enveloppeParDefautValue);
          return ev ? envelopeLabel(ev) : 'Enveloppe';
        })();

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm" aria-labelledby="config-envelope-heading">
      <h2 id="config-envelope-heading" className="text-base font-semibold tracking-tight">
        Enveloppe
      </h2>
      <p className="text-sm text-muted-foreground">
        Indiquez comment chaque ligne est rattachée à une enveloppe du budget cible.
      </p>

      <div className="space-y-2">
        <Label htmlFor="envelope-import-mode-block">Mode de rattachement</Label>
        <Select
          value={envelopeImportMode}
          onValueChange={(v) => {
            if (v === 'from_file_columns' || v === 'single_envelope') {
              onEnvelopeImportModeChange(v);
            }
          }}
        >
          <SelectTrigger id="envelope-import-mode-block" className="w-full max-w-xl">
            <SelectValue>{ENVELOPE_MODE_LABELS[envelopeImportMode]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="from_file_columns">{ENVELOPE_MODE_LABELS.from_file_columns}</SelectItem>
            <SelectItem value="single_envelope">{ENVELOPE_MODE_LABELS.single_envelope}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {envelopeImportMode === 'from_file_columns' ? (
            <>
              Chaque ligne est affectée à une enveloppe selon une <strong>colonne</strong> du fichier. Vous pouvez aussi
              définir une enveloppe par défaut pour les lignes sans code reconnu.
            </>
          ) : (
            <>
              Toutes les lignes sont importées dans <strong>la même enveloppe</strong>. Aucune colonne enveloppe du
              fichier n’est utilisée.
            </>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCreateError(null);
            setModalOpen(true);
          }}
        >
          Créer une enveloppe
        </Button>
        <p className="text-xs text-muted-foreground">
          Créez une enveloppe sans quitter l’import, puis sélectionnez-la comme enveloppe cible.
        </p>
      </div>

      {envelopeImportMode === 'from_file_columns' ? (
        <div className="rounded-lg border border-border">
          <div className="px-4 pb-1 pt-2">
            <BudgetImportColSelect
              label="Code enveloppe (fichier)"
              hint="Code ou compte côté fichier pour rattacher la ligne à une enveloppe du budget."
              value={fields.envelopeCode}
              columnChoices={columns}
              onChange={(c) => setField('envelopeCode', c)}
            />
            <BudgetImportColSelect
              label="Référence enveloppe (fichier)"
              hint="Identifiant d’enveloppe tel qu’exporté (si votre fichier l’utilise)."
              value={fields.envelopeId}
              columnChoices={columns}
              onChange={(c) => setField('envelopeId', c)}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label>
          {envelopeImportMode === 'single_envelope'
            ? 'Enveloppe cible (toutes les lignes)'
            : 'Enveloppe par défaut (lignes sans code / ID enveloppe reconnu)'}
        </Label>
        <Select
          value={enveloppeParDefautValue}
          onValueChange={(id) =>
            onOptionsChange({
              ...options,
              defaultEnvelopeId: id === EMPTY_SELECT_VALUE || !id ? undefined : id,
            })
          }
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue>{libelleEnveloppeParDefaut}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_SELECT_VALUE}>Aucune</SelectItem>
            {envelopes.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {envelopeLabel(e)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer une enveloppe</DialogTitle>
            <DialogDescription>
              L’enveloppe sera ajoutée au budget courant puis disponible immédiatement dans la liste.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-envelope-name">Nom</Label>
              <Input
                id="new-envelope-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex. RUN - Plateforme"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-envelope-code">Code (optionnel)</Label>
              <Input
                id="new-envelope-code"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value)}
                placeholder="Ex. ENV-RUN-01"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-envelope-description">Description (optionnel)</Label>
              <Input
                id="new-envelope-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={createType} onValueChange={(v) => v && setCreateType(v)}>
                <SelectTrigger>
                  <SelectValue>{createType}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUN">RUN</SelectItem>
                  <SelectItem value="BUILD">BUILD</SelectItem>
                  <SelectItem value="TRANSVERSE">TRANSVERSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={createLoading}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={createLoading || !createName.trim()}
              onClick={async () => {
                setCreateError(null);
                setCreateLoading(true);
                try {
                  const created = await onCreateEnvelope({
                    name: createName.trim(),
                    code: createCode.trim() || undefined,
                    description: createDescription.trim() || undefined,
                    type: createType,
                  });
                  onOptionsChange({ ...options, defaultEnvelopeId: created.id });
                  setCreateName('');
                  setCreateCode('');
                  setCreateDescription('');
                  setCreateType('RUN');
                  setModalOpen(false);
                } catch (e) {
                  setCreateError(e instanceof Error ? e.message : 'Impossible de créer l’enveloppe.');
                } finally {
                  setCreateLoading(false);
                }
              }}
            >
              {createLoading ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
