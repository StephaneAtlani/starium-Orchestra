'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type HierarchyOption = { id: string; label: string };

export type ProjectBudgetHierarchyComboboxProps = {
  id?: string;
  label: string;
  placeholder: string;
  /** Valeur technique (ex. __none__ ou id) — inclure une option « aucune » dans `options` */
  value: string;
  /** Id de l’option « aucune » : champ fermé affiché vide + placeholder */
  noneId: string;
  options: HierarchyOption[];
  onValueChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
  errorText?: string | null;
  emptyText?: string | null;
  className?: string;
};

type ListPosition = { top: number; left: number; width: number };

/**
 * Input filtrable + liste déroulante (sans Base UI Select) pour budget / enveloppe / ligne.
 * Liste portée sur `document.body` pour éviter le clipping dans les modales.
 */
export function ProjectBudgetHierarchyCombobox({
  id: propId,
  label,
  placeholder,
  value,
  noneId,
  options,
  onValueChange,
  disabled = false,
  loading = false,
  errorText,
  emptyText,
  className,
}: ProjectBudgetHierarchyComboboxProps) {
  const reactId = useId();
  const inputId = propId ?? `pb-hier-${reactId}`;
  const listId = `${inputId}-listbox`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [listPosition, setListPosition] = useState<ListPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedLabel = useMemo(() => {
    if (value === noneId) return '';
    return options.find((o) => o.id === value)?.label ?? '';
  }, [options, value, noneId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setListPosition(null);
  }, []);

  const updateListPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setListPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateListPosition();
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const listEl = document.getElementById(listId);
      if (listEl?.contains(target)) return;
      close();
    };
    const onReposition = () => updateListPosition();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [close, listId, open, updateListPosition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    if (open) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open, close]);

  const showList = open && !disabled && !loading && listPosition != null;

  const inputDisplay = open ? query : selectedLabel;

  const listbox =
    mounted && showList
      ? createPortal(
          <ul
            id={listId}
            role="listbox"
            className="fixed z-[400] max-h-60 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10"
            style={{
              top: listPosition.top,
              left: listPosition.left,
              width: listPosition.width,
            }}
          >
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-xs text-muted-foreground">Aucun résultat</li>
            ) : (
              filtered.map((o) => (
                <li key={o.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === o.id}
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/60',
                      value === o.id && 'bg-accent/40',
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      onValueChange(o.id);
                      close();
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={cn('relative space-y-2', className)}>
      <Label htmlFor={inputId} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled || loading}
          placeholder={loading ? 'Chargement…' : placeholder}
          value={loading ? '' : inputDisplay}
          readOnly={loading}
          className="h-9 w-full min-w-0 pr-9"
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) {
              setOpen(true);
              updateListPosition();
            }
          }}
          onFocus={() => {
            if (disabled || loading) return;
            setOpen(true);
            updateListPosition();
            setQuery('');
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || loading}
          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40"
          aria-label="Ouvrir la liste"
          onMouseDown={(e) => {
            e.preventDefault();
            if (disabled || loading) return;
            const wasOpen = open;
            if (!wasOpen) {
              setOpen(true);
              updateListPosition();
              setQuery('');
            } else {
              close();
            }
          }}
        >
          <ChevronDown className="size-4 opacity-70" />
        </button>
      </div>

      {listbox}

      {errorText ? (
        <p className="text-xs text-destructive">{errorText}</p>
      ) : null}
      {emptyText && !errorText ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : null}
    </div>
  );
}
