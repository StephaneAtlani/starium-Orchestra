'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSuppliersDropdownQuery } from '../hooks/use-suppliers-dropdown-query';
import type { Supplier } from '../types/supplier.types';

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
  },
  ref,
) {
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelSearch, setPanelSearch] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const query = useSuppliersDropdownQuery(panelSearch, parentOpen && panelOpen);

  const updateCoords = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 220),
    });
  }, []);

  useLayoutEffect(() => {
    if (!panelOpen) {
      setCoords(null);
      return;
    }
    updateCoords();
    const onScroll = () => updateCoords();
    const onResize = () => updateCoords();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [panelOpen, updateCoords]);

  useEffect(() => {
    if (!panelOpen) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rowRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setPanelOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [panelOpen]);

  useEffect(() => {
    if (!parentOpen) setPanelOpen(false);
  }, [parentOpen]);

  const openPanel = () => {
    setPanelSearch(value.trim() || '');
    setPanelOpen(true);
    queueMicrotask(() => updateCoords());
  };

  const items: Supplier[] = query.data?.items ?? [];

  const handlePick = (s: Supplier) => {
    onChange(s.name);
    onSupplierPicked({ id: s.id, name: s.name });
    setPanelOpen(false);
  };

  const panel =
    panelOpen && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className={cn(
              'rounded-md border border-border bg-white p-2 shadow-lg',
              'max-h-64 overflow-y-auto',
            )}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Input
              ref={searchInputRef}
              placeholder="Rechercher un fournisseur…"
              value={panelSearch}
              onChange={(e) => setPanelSearch(e.target.value)}
              className="mb-2 h-8"
              disabled={disabled}
            />
            {query.isLoading && (
              <p className="px-2 py-1 text-xs text-muted-foreground">Chargement…</p>
            )}
            {query.isError && (
              <p className="px-2 py-1 text-xs text-destructive">Erreur de chargement.</p>
            )}
            {!query.isLoading && !query.isError && items.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">Aucun résultat.</p>
            )}
            <ul className="space-y-0.5">
              {items.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => handlePick(s)}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={rowRef} className="flex min-w-0 flex-1 gap-1">
        <Input
          ref={ref}
          id={id}
          name={name}
          value={value}
          onChange={(e) => {
            onManualInput();
            onChange(e.target.value);
          }}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-expanded={panelOpen}
          aria-haspopup="listbox"
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
          aria-label="Ouvrir la liste des fournisseurs"
          title="Liste et recherche"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (panelOpen) {
              setPanelOpen(false);
            } else {
              openPanel();
            }
          }}
        >
          <ChevronDown className="size-4 opacity-70" />
        </Button>
      </div>
      {panel}
    </>
  );
});
