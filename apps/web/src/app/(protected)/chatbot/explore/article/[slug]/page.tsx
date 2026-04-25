'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { stariumApiPath } from '@/lib/starium-api-base';

type StructuredLink = { label: string; route: string; type: 'INTERNAL_PAGE' | 'MODULE' };

type ArticlePayload = {
  title: string;
  slug: string;
  answer: string;
  content: string | null;
  structuredLinks: StructuredLink[];
  relatedArticles: { title: string; slug: string; icon?: string | null }[];
  category: { name: string; slug: string; icon: string | null } | null;
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

export default function ChatbotExploreArticlePage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const fetchAuth = useAuthenticatedFetch();
  const [data, setData] = useState<ArticlePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setErr(null);
    const url = stariumApiPath(`/api/chatbot/entries/${encodeURIComponent(slug)}`);
    try {
      const res = await fetchAuth(url);
      if (res.status === 404) {
        setErr('Article introuvable ou non accessible.');
        setData(null);
        return;
      }
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        setData(null);
        return;
      }
      setData((await res.json()) as ArticlePayload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchAuth, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer>
      <PageHeader
        title={data?.title ?? 'Article'}
        description={data?.category ? `Catégorie : ${data.category.name}` : undefined}
        actions={
          <Link className="text-sm underline" href="/chatbot/explore">
            Explorer
          </Link>
        }
      />

      {loading && <LoadingState rows={4} />}
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {data && !loading && (
        <article className="prose prose-sm dark:prose-invert max-w-none space-y-4">
          <p className="text-muted-foreground text-sm">{data.answer}</p>
          {data.content ? (
            <div className="whitespace-pre-wrap text-sm">{data.content}</div>
          ) : null}
          {data.structuredLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 not-prose">
              {data.structuredLinks.map((l, i) => (
                <Button key={i} variant="secondary" size="sm" asChild>
                  <Link href={hrefForStructuredLink(l)}>{l.label}</Link>
                </Button>
              ))}
            </div>
          )}
          {data.relatedArticles.length > 0 && (
            <div className="not-prose text-sm">
              <p className="font-medium">Articles liés</p>
              <ul className="list-inside list-disc">
                {data.relatedArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      className="underline"
                      href={`/chatbot/explore/article/${encodeURIComponent(a.slug)}`}
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      )}
    </PageContainer>
  );
}
