'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { stariumApiPath } from '@/lib/starium-api-base';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type EntryRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  scope: string;
  isActive: boolean;
  archivedAt: string | null;
};

export default function AdminChatbotPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const fetchAuth = useAuthenticatedFetch();
  const [rows, setRows] = useState<EntryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    title: '',
    question: '',
    answer: '',
    scope: 'GLOBAL' as 'GLOBAL' | 'CLIENT',
    clientId: '',
    type: 'FAQ' as 'FAQ' | 'ARTICLE',
  });

  useEffect(() => {
    if (authLoading) return;
    if (user?.platformRole !== 'PLATFORM_ADMIN') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const url = stariumApiPath('/api/platform/chatbot/entries');
    try {
      const res = await fetchAuth(url);
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        setRows(null);
        return;
      }
      setRows((await res.json()) as EntryRow[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur');
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [fetchAuth]);

  useEffect(() => {
    if (authLoading || user?.platformRole !== 'PLATFORM_ADMIN') return;
    void load();
  }, [authLoading, user, load]);

  async function createEntry() {
    setCreating(true);
    setErr(null);
    const body: Record<string, unknown> = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      question: form.question.trim(),
      answer: form.answer.trim(),
      scope: form.scope,
      type: form.type,
    };
    if (form.scope === 'CLIENT') {
      body.clientId = form.clientId.trim() || null;
    }
    const url = stariumApiPath('/api/platform/chatbot/entries');
    try {
      const res = await fetchAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        return;
      }
      setForm({
        slug: '',
        title: '',
        question: '',
        answer: '',
        scope: 'GLOBAL',
        clientId: '',
        type: 'FAQ',
      });
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function archive(id: string) {
    const url = stariumApiPath(`/api/platform/chatbot/entries/${id}/archive`);
    const res = await fetchAuth(url, { method: 'PATCH' });
    if (!res.ok) {
      setErr(await res.text().catch(() => res.statusText));
      return;
    }
    await load();
  }

  if (authLoading || user?.platformRole !== 'PLATFORM_ADMIN') {
    return authLoading ? (
      <PageContainer>
        <LoadingState rows={4} />
      </PageContainer>
    ) : null;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Chatbot — entrées knowledge"
        description="Gestion plateforme des FAQ et articles (Cursor Starium). Les libellés affichés sont métier (titre, slug, portée) — les identifiants techniques servent uniquement aux actions d’archivage."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/dashboard">Retour plateforme</Link>
          </Button>
        }
      />

      <section className="mb-8 rounded-lg border border-border/60 p-4 space-y-3 max-w-xl">
        <h2 className="text-sm font-semibold">Créer une entrée (minimal)</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cb-slug">Slug</Label>
            <Input
              id="cb-slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="exemple-faq"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cb-title">Titre</Label>
            <Input
              id="cb-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cb-q">Question</Label>
          <Input
            id="cb-q"
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cb-a">Réponse courte</Label>
          <Input
            id="cb-a"
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="cb-scope"
              checked={form.scope === 'GLOBAL'}
              onChange={() => setForm((f) => ({ ...f, scope: 'GLOBAL' }))}
            />
            GLOBAL
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="cb-scope"
              checked={form.scope === 'CLIENT'}
              onChange={() => setForm((f) => ({ ...f, scope: 'CLIENT' }))}
            />
            CLIENT
          </label>
          {form.scope === 'CLIENT' && (
            <Input
              className="max-w-xs"
              placeholder="ID client (interne)"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            />
          )}
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="cb-type"
              checked={form.type === 'FAQ'}
              onChange={() => setForm((f) => ({ ...f, type: 'FAQ' }))}
            />
            FAQ
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="cb-type"
              checked={form.type === 'ARTICLE'}
              onChange={() => setForm((f) => ({ ...f, type: 'ARTICLE' }))}
            />
            ARTICLE
          </label>
        </div>
        <Button type="button" disabled={creating} onClick={() => void createEntry()}>
          {creating ? 'Création…' : 'Créer'}
        </Button>
      </section>

      {loading && <LoadingState rows={6} />}
      {err && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {rows && !loading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Portée</TableHead>
              <TableHead>État</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.slug}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>{r.scope}</TableCell>
                <TableCell>
                  {r.isActive && !r.archivedAt ? 'Actif' : 'Archivé'}
                </TableCell>
                <TableCell className="text-right">
                  {r.isActive && !r.archivedAt ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void archive(r.id)}>
                      Archiver
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  );
}
