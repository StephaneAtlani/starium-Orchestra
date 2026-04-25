'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  ChevronRight,
  CircleHelp,
  Home,
  MessageCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuth } from '@/context/auth-context';
import { stariumApiPath } from '@/lib/starium-api-base';
import { cn } from '@/lib/utils';

type ChatLine = { role: 'USER' | 'ASSISTANT'; content: string };

type StructuredLink = {
  label: string;
  route: string;
  type: 'INTERNAL_PAGE' | 'MODULE';
};

const MODULE_ENTRY_HREF: Record<string, string> = {
  budgets: '/budgets',
  projects: '/projects',
  contracts: '/contracts',
  procurement: '/procurement',
  strategic_vision: '/strategic-vision',
  compliance: '/compliance',
};

function hrefForStructuredLink(l: StructuredLink): string {
  if (l.type === 'INTERNAL_PAGE') return l.route;
  return MODULE_ENTRY_HREF[l.route] ?? '/dashboard';
}

type PostMessageResponse = {
  conversationId: string;
  answer: string;
  slug: string | null;
  hasFullContent?: boolean;
  structuredLinks?: StructuredLink[];
  relatedArticles?: { title: string; slug: string; icon?: string | null }[];
  fallbackMessage?: string | null;
};

type ExplorePayload = {
  categories: { name: string; slug: string; isFeatured: boolean }[];
  featuredCategories: { name: string; slug: string }[];
  popularArticles: { title: string; slug: string }[];
};

type ConvRow = { id: string; title: string | null; updatedAt: string };

function formatRelativeFr(iso: string): string {
  try {
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
    const diffMs = new Date(iso).getTime() - Date.now();
    const days = Math.round(diffMs / (86400 * 1000));
    if (Math.abs(days) < 1) {
      const hours = Math.round(diffMs / (3600 * 1000));
      if (Math.abs(hours) < 1) return "À l'instant";
      return rtf.format(hours, 'hour');
    }
    if (Math.abs(days) < 30) return rtf.format(days, 'day');
    const months = Math.round(days / 30);
    return rtf.format(months, 'month');
  } catch {
    return '';
  }
}

type TabId = 'home' | 'conversations' | 'help';

export function StariumChatDrawer() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [explore, setExplore] = useState<ExplorePayload | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'empty' | 'error' | 'unauthorized'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastExtras, setLastExtras] = useState<{
    slug: string | null;
    hasFullContent: boolean;
    structuredLinks: StructuredLink[];
    relatedArticles: { title: string; slug: string; icon?: string | null }[];
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fetchAuth = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { user } = useAuth();

  const firstName = user?.firstName?.trim() || null;
  const greetingName = firstName || 'vous';

  const loadHomeData = useCallback(async () => {
    if (!activeClient?.id) return;
    const exUrl = stariumApiPath('/api/chatbot/explore');
    const cvUrl = stariumApiPath('/api/chatbot/conversations');
    try {
      const [exRes, cvRes] = await Promise.all([fetchAuth(exUrl), fetchAuth(cvUrl)]);
      if (exRes.ok) setExplore((await exRes.json()) as ExplorePayload);
      if (cvRes.ok) setConversations((await cvRes.json()) as ConvRow[]);
    } catch {
      /* ignore */
    }
  }, [fetchAuth, activeClient?.id]);

  useEffect(() => {
    if (!open) return;
    void loadHomeData();
  }, [open, loadHomeData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, open, tab, status]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) {
      setStatus('empty');
      return;
    }
    if (!activeClient?.id) {
      setStatus('unauthorized');
      return;
    }
    setStatus('loading');
    setErrorMessage(null);
    setInput('');
    setLines((prev) => [...prev, { role: 'USER', content: text }]);

    const url = stariumApiPath('/api/chatbot/message');
    const body: Record<string, string> = { text };
    if (conversationId) body.conversationId = conversationId;

    try {
      const res = await fetchAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401 || res.status === 403) {
        setStatus('unauthorized');
        setLines((prev) => prev.slice(0, -1));
        return;
      }
      if (!res.ok) {
        setStatus('error');
        setErrorMessage(await res.text().catch(() => res.statusText));
        setLines((prev) => prev.slice(0, -1));
        return;
      }
      const data = (await res.json()) as PostMessageResponse;
      setConversationId(data.conversationId);
      let assistant = data.answer;
      if (data.fallbackMessage && !data.slug) {
        assistant = data.fallbackMessage;
      }
      setLines((prev) => [...prev, { role: 'ASSISTANT', content: assistant }]);
      setLastExtras({
        slug: data.slug,
        hasFullContent: !!data.hasFullContent,
        structuredLinks: data.structuredLinks ?? [],
        relatedArticles: data.relatedArticles ?? [],
      });
      setStatus('idle');
      void loadHomeData();
    } catch (e) {
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Erreur réseau');
      setLines((prev) => prev.slice(0, -1));
    }
  }, [input, fetchAuth, activeClient?.id, conversationId, loadHomeData]);

  const reset = () => {
    setTab('home');
    setLines([]);
    setConversationId(null);
    setStatus('idle');
    setErrorMessage(null);
    setInput('');
    setLastExtras(null);
  };

  const openConversation = async (id: string) => {
    setConversationId(id);
    setTab('conversations');
    const url = stariumApiPath(`/api/chatbot/conversations/${id}/messages`);
    const res = await fetchAuth(url);
    if (!res.ok) {
      setLines([]);
      return;
    }
    const msgs = (await res.json()) as { role: string; content: string }[];
    setLines(
      msgs.map((m) => ({
        role: m.role === 'USER' ? 'USER' : 'ASSISTANT',
        content: m.content,
      })),
    );
    setLastExtras(null);
  };

  const startNewConversation = () => {
    setConversationId(null);
    setLines([]);
    setLastExtras(null);
    setTab('conversations');
  };

  const faqRows: { label: string; href: string }[] = [];
  if (explore) {
    for (const c of explore.featuredCategories.slice(0, 4)) {
      faqRows.push({
        label: c.name,
        href: `/chatbot/explore/category/${encodeURIComponent(c.slug)}`,
      });
    }
    for (const a of explore.popularArticles.slice(0, 4)) {
      if (faqRows.length >= 8) break;
      faqRows.push({
        label: a.title,
        href: `/chatbot/explore/article/${encodeURIComponent(a.slug)}`,
      });
    }
  }

  const recent = conversations[0] ?? null;

  return (
    <>
      {/* Bas-droite de la zone principale (absolute : pas sous la sidebar). */}
      {!open && (
        <button
          type="button"
          aria-label="Ouvrir Cursor Starium"
          title="Cursor Starium — aide et base de connaissance"
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className={cn(
            'absolute z-20 flex h-14 w-14 items-center justify-center rounded-full',
            'bg-primary text-primary-foreground shadow-[0_8px_32px_-4px_rgba(0,0,0,0.35)]',
            'ring-4 ring-background transition-transform hover:scale-[1.06] active:scale-95',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2',
            'bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] sm:bottom-6 sm:right-6',
            'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95',
            'motion-safe:slide-in-from-bottom-6 motion-safe:slide-in-from-right-6 motion-safe:duration-500 motion-safe:fill-mode-both',
          )}
        >
          <Sparkles className="starium-chat-fab-icon-float h-6 w-6" aria-hidden />
          <span
            className="absolute -right-0.5 -top-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[8px] font-bold leading-none text-white ring-2 ring-background"
            aria-hidden
          />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent chatWidget showCloseButton>
          <DialogTitle className="sr-only">Cursor Starium</DialogTitle>
          <DialogDescription className="sr-only">
            Assistant à réponses configurées — style accueil support.
          </DialogDescription>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* ——— Accueil ——— */}
            {tab === 'home' && (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="relative bg-gradient-to-b from-primary via-primary to-primary/85 px-5 pb-14 pt-4 text-primary-foreground">
                  <div className="flex items-center gap-2 pr-10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
                      <Sparkles className="h-5 w-5 text-white" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-wide text-white">Cursor Starium</p>
                      <p className="text-[0.65rem] text-white/80">Support &amp; base de connaissance</p>
                    </div>
                  </div>
                  <h2 className="mt-5 text-[1.35rem] font-bold leading-tight tracking-tight text-white drop-shadow-sm">
                    Bonjour {greetingName} 👋
                  </h2>
                  <p className="mt-1 text-sm text-white/90">Comment pouvons-nous vous aider ?</p>
                </div>

                <div className="relative z-[1] -mt-8 flex flex-col gap-3 px-3 pb-3">
                  {status === 'unauthorized' && (
                    <Alert variant="destructive" className="border-destructive/50">
                      <AlertDescription>
                        Sélectionnez un client actif pour utiliser le chatbot.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Card className="border-0 shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.08]" size="sm">
                    <CardContent className="px-4 py-3">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        Message récent
                      </p>
                      {recent ? (
                        <button
                          type="button"
                          className="mt-2 flex w-full gap-3 rounded-lg text-left transition-colors hover:bg-muted/60"
                          onClick={() => void openConversation(recent.id)}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {recent.title || 'Conversation'}
                              </p>
                              <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                                {formatRelativeFr(recent.updatedAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              Touchez pour reprendre cette conversation.
                            </p>
                          </div>
                        </button>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Aucune conversation pour le moment.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.08]" size="sm">
                    <CardContent className="px-0 py-0">
                      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                        <span className="text-sm font-semibold text-foreground">Trouver une réponse</span>
                        <Search className="h-4 w-4 text-primary" aria-hidden />
                      </div>
                      <ul className="divide-y divide-border/50">
                        {faqRows.length === 0 ? (
                          <li className="px-4 py-3 text-xs text-muted-foreground">
                            Aucune suggestion pour ce client. Explorez la base depuis l’onglet Aide.
                          </li>
                        ) : (
                          faqRows.map((row) => (
                            <li key={row.href}>
                              <Link
                                href={row.href}
                                className="flex items-center justify-between gap-2 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                                onClick={() => setOpen(false)}
                              >
                                <span className="line-clamp-2">{row.label}</span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-primary opacity-80" />
                              </Link>
                            </li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Button
                    type="button"
                    className="w-full rounded-xl font-medium shadow-sm"
                    onClick={() => {
                      startNewConversation();
                    }}
                  >
                    Poser une nouvelle question
                  </Button>
                </div>
              </div>
            )}

            {/* ——— Conversations (fil + saisie) ——— */}
            {tab === 'conversations' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setTab('home');
                    }}
                  >
                    ← Accueil
                  </Button>
                  {conversationId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        startNewConversation();
                      }}
                    >
                      Nouvelle
                    </Button>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto bg-muted/15 px-3 py-3">
                  {conversations.length > 0 && !conversationId && lines.length === 0 && (
                    <ul className="mb-3 space-y-1 rounded-xl border border-border/50 bg-card p-2 text-xs shadow-sm">
                      {conversations.slice(0, 6).map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-muted/70"
                            onClick={() => void openConversation(c.id)}
                          >
                            <span className="truncate font-medium text-foreground">
                              {c.title || 'Conversation'}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {status === 'empty' && (
                    <Alert className="mb-2 border-amber-500/40 bg-amber-500/5 py-2">
                      <AlertDescription className="text-xs">Saisissez une question.</AlertDescription>
                    </Alert>
                  )}
                  {status === 'error' && errorMessage && (
                    <Alert variant="destructive" className="mb-2 py-2">
                      <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                  {lines.length === 0 && conversationId === null && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Écrivez votre question ci-dessous. La réponse provient uniquement de la base configurée.
                    </p>
                  )}
                  {lines.map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        'mb-2 flex w-full',
                        line.role === 'USER' ? 'justify-end' : 'justify-start',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[88%] rounded-2xl px-3 py-2 text-[0.8125rem] leading-relaxed shadow-sm',
                          line.role === 'USER'
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md border border-border/60 bg-card text-card-foreground',
                        )}
                      >
                        {line.content}
                      </div>
                    </div>
                  ))}
                  {status === 'loading' && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
                        <span className="flex gap-1">
                          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.08s]" />
                          <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                        </span>
                        Réponse…
                      </div>
                    </div>
                  )}
                  {lastExtras && lastExtras.slug && lastExtras.hasFullContent && (
                    <div className="mb-2 flex justify-start">
                      <Button variant="secondary" size="sm" className="h-8 text-xs" asChild>
                        <Link
                          href={`/chatbot/explore/article/${encodeURIComponent(lastExtras.slug)}`}
                          onClick={() => setOpen(false)}
                        >
                          Voir le détail
                        </Link>
                      </Button>
                    </div>
                  )}
                  {lastExtras && lastExtras.structuredLinks.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {lastExtras.structuredLinks.map((l, idx) => (
                        <Button key={idx} variant="outline" size="sm" className="h-7 text-[0.65rem]" asChild>
                          <Link href={hrefForStructuredLink(l)}>{l.label}</Link>
                        </Button>
                      ))}
                    </div>
                  )}
                  {lastExtras && lastExtras.relatedArticles.length > 0 && (
                    <div className="rounded-xl border border-border/50 bg-card/90 p-2 text-[0.65rem] shadow-sm">
                      <p className="mb-1 font-medium text-foreground">Articles liés</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {lastExtras.relatedArticles.map((a) => (
                          <li key={a.slug}>
                            <Link
                              className="underline hover:text-foreground"
                              href={`/chatbot/explore/article/${encodeURIComponent(a.slug)}`}
                              onClick={() => setOpen(false)}
                            >
                              {a.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
                <div className="shrink-0 border-t border-border/60 bg-background/95 p-2.5 backdrop-blur">
                  <div className="flex items-end gap-1.5 rounded-2xl border border-input/80 bg-muted/25 p-1 pl-2.5 shadow-inner">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Votre message…"
                      className="min-h-9 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      disabled={status === 'loading'}
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-xl"
                      disabled={status === 'loading' || !input.trim()}
                      aria-label="Envoyer"
                      onClick={() => void send()}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ——— Aide ——— */}
            {tab === 'help' && (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <h3 className="text-sm font-semibold text-foreground">Aide</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Cursor Starium affiche uniquement des réponses préconfigurées par votre administrateur plateforme. Aucune
                  génération par IA à partir de vos données métier.
                </p>
                <Button className="mt-4 w-full" variant="secondary" asChild>
                  <Link href="/chatbot/explore" onClick={() => setOpen(false)}>
                    Ouvrir l’explorateur de la base
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Barre navigation façon widget support */}
          <nav
            className="flex shrink-0 border-t border-border/70 bg-card px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)]"
            aria-label="Navigation chatbot"
          >
            {(
              [
                { id: 'home' as const, label: 'Accueil', Icon: Home },
                { id: 'conversations' as const, label: 'Conversations', Icon: MessageCircle },
                { id: 'help' as const, label: 'Aide', Icon: CircleHelp },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[0.65rem] font-medium transition-colors',
                  tab === id
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5', tab === id && 'text-primary')} aria-hidden />
                {label}
              </button>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
