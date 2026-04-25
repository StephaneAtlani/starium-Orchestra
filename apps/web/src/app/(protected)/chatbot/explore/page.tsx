'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { stariumApiPath } from '@/lib/starium-api-base';

type ExplorePayload = {
  categories: {
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    isFeatured: boolean;
    order: number;
  }[];
  featuredCategories: {
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    isFeatured: boolean;
    order: number;
  }[];
  popularArticles: { title: string; slug: string; icon: string | null; type: string }[];
  articles: { title: string; slug: string; icon: string | null; type: string }[];
};

export default function ChatbotExplorePage() {
  const fetchAuth = useAuthenticatedFetch();
  const [q, setQ] = useState('');
  const [data, setData] = useState<ExplorePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    const url = stariumApiPath(`/api/chatbot/explore${qs}`);
    try {
      const res = await fetchAuth(url);
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        setData(null);
        return;
      }
      setData((await res.json()) as ExplorePayload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchAuth, q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer>
      <PageHeader
        title="Explorer — Cursor Starium"
        description="Catégories et articles de la base de connaissance, sans passer par le chat."
      />

      <div className="mb-6 flex max-w-xl flex-col gap-2 sm:flex-row">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Recherche (titre, question, slug)…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load();
          }}
        />
        <Button type="button" onClick={() => void load()}>
          Rechercher
        </Button>
      </div>

      {loading && <LoadingState rows={6} />}
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {data && !loading && (
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground">
              Catégories mises en avant
            </h2>
            {data.featuredCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune catégorie mise en avant.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {data.featuredCategories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/chatbot/explore/category/${encodeURIComponent(c.slug)}`}
                      className="block rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/60"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.description ? (
                        <span className="mt-1 block text-xs text-muted-foreground">{c.description}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground">
              Toutes les catégories
            </h2>
            {data.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune catégorie.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {data.categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/chatbot/explore/category/${encodeURIComponent(c.slug)}`}
                      className="block rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/60"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground">
              Articles populaires
            </h2>
            {data.popularArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun article populaire.</p>
            ) : (
              <ul className="space-y-1">
                {data.popularArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      className="text-sm underline hover:text-foreground"
                      href={`/chatbot/explore/article/${encodeURIComponent(a.slug)}`}
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {q.trim().length >= 2 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground">
                Résultats
              </h2>
              {data.articles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun résultat.</p>
              ) : (
                <ul className="space-y-1">
                  {data.articles.map((a) => (
                    <li key={a.slug}>
                      <Link
                        className="text-sm underline hover:text-foreground"
                        href={`/chatbot/explore/article/${encodeURIComponent(a.slug)}`}
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}
