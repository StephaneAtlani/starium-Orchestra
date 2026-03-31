'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSuppliersDropdownQuery } from '../hooks/use-suppliers-dropdown-query';
import type { Supplier } from '../types/supplier.types';
import { normalizeSupplierName } from '../utils/normalize-supplier-name';

export type SupplierSearchComboboxProps = {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  /** Dialog parent ouvert (évite les requêtes inutiles) */
  parentOpen: boolean;
  /** Sélection depuis la liste : id connu pour le submit */
  onSupplierPicked: (supplier: { id: string; name: string }) => void;
  /** Saisie libre dans le champ principal */
  onManualInput: () => void;
  /** Vérification déclenchée à la sortie du champ */
  onValidateOnBlur?: (value: string) => Promise<void> | void;
  /** Indique qu'un fournisseur a été sélectionné (masque le hint doublon) */
  hasSupplierSelection?: boolean;
  /** Ouvre la modale "Nouveau fournisseur" (bouton + à droite) */
  onRequestOpenCreateDialog?: (draftName: string) => void;
  /** Demande d'ouverture du quick-create (prérempli avec le texte saisi) */
  onRequestQuickCreate?: (draftName: string) => void;
};

export const SupplierSearchCombobox = React.forwardRef<
  HTMLInputElement,
  SupplierSearchComboboxProps
>(function SupplierSearchCombobox(
  {
    id,
    name,
    value,
    onChange,
    onBlur,
    disabled,
    'aria-invalid': ariaInvalid,
    parentOpen,
    onSupplierPicked,
    onManualInput,
    onValidateOnBlur,
    hasSupplierSelection,
    onRequestOpenCreateDialog,
    onRequestQuickCreate,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [fieldActive, setFieldActive] = useState(false);

  const query = useSuppliersDropdownQuery(pickerSearch, parentOpen && pickerOpen, 0);
  const items: Supplier[] = query.data?.items ?? [];
  const normalizedValue = value.trim().replace(/\s+/g, ' ');
  const suggestionsQuery = useSuppliersDropdownQuery(normalizedValue, parentOpen, 2);

  const closestCandidates = useMemo(() => {
    if (!normalizedValue) return [];
    const inputN = normalizeSupplierName(normalizedValue);
    const candidateItems = suggestionsQuery.data?.items ?? [];
    return candidateItems
      .map((s) => {
        const n = normalizeSupplierName(s.name);
        if (n === inputN) return { s, rank: 0 };
        if (n.startsWith(inputN)) return { s, rank: 1 };
        if (n.includes(inputN)) return { s, rank: 2 };
        return null;
      })
      .filter((x): x is { s: Supplier; rank: number } => x !== null)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map((x) => x.s);
  }, [suggestionsQuery.data?.items, normalizedValue]);

  const handlePick = (s: Supplier) => {
    onChange(s.name);
    onSupplierPicked({ id: s.id, name: s.name });
    setPickerOpen(false);
    setPickerSearch('');
    setFieldActive(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <>
      <div ref={containerRef} className="relative flex min-w-0 flex-1 gap-1">
        <Input
          ref={(node) => {
            inputRef.current = node;
            if (!ref) return;
            if (typeof ref === 'function') {
              ref(node);
            } else {
              ref.current = node;
            }
          }}
          id={id}
          name={name}
          value={value}
          onChange={(e) => {
            onManualInput();
            onChange(e.target.value);
          }}
          onBlur={(e) => {
            onBlur?.();
            const next = e.relatedTarget as Node | null;
            if (next && containerRef.current?.contains(next)) return;
            setFieldActive(false);
            void onValidateOnBlur?.(e.currentTarget.value);
          }}
          onFocus={() => setFieldActive(true)}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          autoComplete="off"
          className="min-w-0 flex-1"
          placeholder="Nom du fournisseur"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={disabled}
          aria-label="Rechercher un fournisseur"
          title="Rechercher un fournisseur"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPickerSearch(value.trim());
            setPickerOpen(true);
          }}
        >
          <Search className="size-4 opacity-70" />
        </Button>
        {onRequestOpenCreateDialog ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            disabled={disabled}
            aria-label="Créer un fournisseur"
            title="Créer un fournisseur"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPickerOpen(false);
              setFieldActive(false);
              onRequestOpenCreateDialog(normalizedValue);
            }}
          >
            <Plus className="size-4 opacity-70" />
          </Button>
        ) : null}
        {fieldActive && (
          <div
            className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border bg-white p-2 shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
          >
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Fournisseur introuvable, voulez-vous sélectionner un proche ou créer ?
            </p>
            {normalizedValue.length < 2 && (
              <p className="mb-2 text-xs text-muted-foreground">Tapez au moins 2 caractères</p>
            )}
            {closestCandidates.length > 0 && (
              <div className="mb-2 space-y-1">
                {closestCandidates.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => handlePick(s)}
                  >
                    Utiliser: {s.name}
                  </button>
                ))}
              </div>
            )}
            {onRequestQuickCreate && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full justify-start"
                disabled={disabled || normalizedValue.length < 2}
                onClick={() => {
                  setFieldActive(false);
                  onRequestQuickCreate(normalizedValue);
                }}
              >
                Créer &quot;{normalizedValue}&quot;
              </Button>
            )}
          </div>
        )}
      </div>
      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open) setPickerSearch('');
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choisir un fournisseur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              placeholder="Rechercher un fournisseur..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              disabled={disabled}
              autoFocus
            />
            <div className="max-h-72 overflow-y-auto rounded-md border border-border p-1">
              {query.isLoading && (
                <p className="px-2 py-1 text-xs text-muted-foreground">Chargement...</p>
              )}
              {query.isError && (
                <p className="px-2 py-1 text-xs text-destructive">Erreur de chargement.</p>
              )}
              {!query.isLoading && !query.isError && items.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">Aucun fournisseur.</p>
              )}
              {!query.isLoading && !query.isError && items.length > 0 && (
                <ul className="space-y-0.5">
                  {items.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={cn('w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted')}
                        onClick={() => handlePick(s)}
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
              Fermer
            </Button>
            {onRequestQuickCreate && (
              <Button
                type="button"
                variant="secondary"
                disabled={disabled || !pickerSearch.trim()}
                onClick={() => {
                  setPickerOpen(false);
                  onRequestQuickCreate(pickerSearch.trim());
                }}
              >
                Créer &quot;{pickerSearch.trim()}&quot;
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
