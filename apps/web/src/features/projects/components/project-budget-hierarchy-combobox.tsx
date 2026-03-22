'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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

/**
 * Input filtrable + liste déroulante (sans Base UI Select) pour budget / enveloppe / ligne.
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
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    if (open) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open, close]);

  const showList = open && !disabled && !loading;

  const inputDisplay = open ? query : selectedLabel;

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
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (disabled || loading) return;
            setOpen(true);
            // Ne pas préremplir avec le libellé sélectionné : le filtre « includes »
            // masquerait toutes les autres options. Liste complète + saisie pour filtrer.
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
            setOpen((o) => !o);
            if (wasOpen) return;
            setQuery('');
          }}
        >
          <ChevronDown className="size-4 opacity-70" />
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10"
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
        </ul>
      )}

      {errorText ? (
        <p className="text-xs text-destructive">{errorText}</p>
      ) : null}
      {emptyText && !errorText ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : null}
    </div>
  );
}
