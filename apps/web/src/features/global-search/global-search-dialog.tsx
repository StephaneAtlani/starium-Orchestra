'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { stariumApiPath } from '@/lib/starium-api-base';
import type { GlobalSearchResponse } from './types';
import { FileText, FolderOpen, Loader2, Search, Wallet, type LucideIcon } from 'lucide-react';

const GROUP_ICONS: Record<string, LucideIcon> = {
  FolderOpen,
  Wallet,
  FileText,
};

function ModuleIcon({ name }: { name: string }) {
  const I = GROUP_ICONS[name] ?? FileText;
  return <I className="h-4 w-4 shrink-0 opacity-80" aria-hidden />;
}

type GlobalSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter();
  const fetchAuth = useAuthenticatedFetch();
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input.trim()), 300);
    return () => window.clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (!open) return;
    if (!debounced) {
      setData(null);
      setErr(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setData(null);
    setErr(null);

    const url = stariumApiPath(
      `/api/search?${new URLSearchParams({ q: debounced }).toString()}`,
    );
    void (async () => {
      try {
        const res = await fetchAuth(url);
        if (cancelled) return;
        if (!res.ok) {
          const raw = await res.text().catch(() => res.statusText);
          let msg = raw;
          try {
            const j = JSON.parse(raw) as { message?: string };
            if (typeof j?.message === 'string' && j.message.trim()) {
              msg = j.message;
            }
          } catch {
            /* texte brut */
          }
          setErr(msg);
          setData(null);
          return;
        }
        setData((await res.json()) as GlobalSearchResponse);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Erreur');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, debounced, fetchAuth]);

  useEffect(() => {
    if (!open) {
      setInput('');
      setDebounced('');
      setData(null);
      setErr(null);
    }
  }, [open]);

  function navigate(route: string) {
    onOpenChange(false);
    router.push(route);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden border-border p-0 gap-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-4 py-3 text-left">
          <DialogTitle className="text-base font-semibold">Recherche globale</DialogTitle>
        </DialogHeader>
        <div className="border-b border-border px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Projets, budgets, aide…"
              className="border-border/80 pl-8"
              autoFocus
              aria-label="Recherche"
            />
            {loading ? (
              <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </div>
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-2 py-2">
          {err ? (
            <p className="px-2 py-4 text-sm text-destructive">{err}</p>
          ) : !debounced ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Saisissez au moins un caractère pour lancer la recherche.
            </p>
          ) : loading ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Recherche…</p>
          ) : data && data.groups.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Aucun résultat</p>
          ) : data ? (
            <div className="space-y-4 pb-2">
              {data.groups.map((g) => (
                <section
                  key={g.moduleCode}
                  className="rounded-lg border border-border/70 bg-muted/20 px-2 py-2"
                  aria-label={g.moduleLabel}
                >
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-background text-foreground">
                      <ModuleIcon name={g.icon} />
                    </span>
                    <span className="text-sm font-semibold starium-text">{g.moduleLabel}</span>
                    <span className="text-xs text-muted-foreground">({g.total})</span>
                  </div>
                  <ul className="space-y-0.5">
                    {g.results.map((r, idx) => (
                      <li key={`${g.moduleCode}-${r.route}-${idx}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto w-full justify-start gap-2 px-2 py-2 text-left font-normal hover:bg-accent"
                          onClick={() => navigate(r.route)}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium starium-text">
                              {r.title}
                            </span>
                            {r.subtitle ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {r.subtitle}
                              </span>
                            ) : null}
                          </span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
