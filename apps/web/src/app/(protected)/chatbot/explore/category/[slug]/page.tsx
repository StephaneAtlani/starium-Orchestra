'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { stariumApiPath } from '@/lib/starium-api-base';

type Row = { title: string; slug: string; icon: string | null; type: string };

export default function ChatbotExploreCategoryPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const fetchAuth = useAuthenticatedFetch();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setErr(null);
    const url = stariumApiPath(
      `/api/chatbot/categories/${encodeURIComponent(slug)}/entries`,
    );
    try {
      const res = await fetchAuth(url);
      if (res.status === 404) {
        setErr('Catégorie introuvable ou non accessible.');
        setRows(null);
        return;
      }
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        setRows(null);
        return;
      }
      setRows((await res.json()) as Row[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setRows(null);
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
        title={`Catégorie : ${slug}`}
        description="Articles et entrées accessibles dans cette catégorie."
        actions={
          <Link className="text-sm underline" href="/chatbot/explore">
            Retour Explorer
          </Link>
        }
      />

      {loading && <LoadingState rows={4} />}
      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {rows && !loading && (
        <ul className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune entrée dans cette catégorie.</p>
          ) : (
            rows.map((r) => (
              <li key={r.slug}>
                <Link
                  className="text-sm font-medium underline hover:text-foreground"
                  href={`/chatbot/explore/article/${encodeURIComponent(r.slug)}`}
                >
                  {r.title}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </PageContainer>
  );
}
