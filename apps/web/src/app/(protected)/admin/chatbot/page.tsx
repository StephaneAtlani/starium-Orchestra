'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type EntryRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  scope: string;
  isActive: boolean;
  archivedAt: string | null;
};

type EntryEditForm = {
  id: string;
  slug: string;
  title: string;
  question: string;
  answer: string;
  content: string;
  categoryId: string;
  scope: 'GLOBAL' | 'CLIENT';
  clientId: string;
  type: 'FAQ' | 'ARTICLE';
  keywordsText: string;
  tagsText: string;
  priority: string;
  isPopular: boolean;
  isFeatured: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  scope: 'GLOBAL' | 'CLIENT';
  clientId: string | null;
  archivedAt: string | null;
  order: number;
};

type ConversationListItem = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  client: { id: string; name: string; slug: string };
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

type ConversationMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  noAnswerFallbackUsed: boolean;
};

type SupportRequestRow = {
  id: string;
  createdAt: string;
  clientName: string;
  clientSlug: string | null;
  userDisplay: string;
  categoryDisplay: string;
  pagePath: string | null;
  messagePreview: string;
  replyCount: number;
};

type SupportThreadPayload = {
  ticket: {
    id: string;
    createdAt: string;
    categoryDisplay: string;
    message: string;
    pagePath: string | null;
    authorDisplay: string;
  };
  replies: Array<{
    id: string;
    createdAt: string;
    body: string;
    authorDisplay: string;
  }>;
};

type ConversationDetailPayload = {
  conversation: {
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
    client: { id: string; name: string; slug: string };
    user: ConversationListItem['user'];
  };
  messages: ConversationMessage[];
};

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

function formatUserLabel(u: ConversationListItem['user']): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  if (name && u.email) return `${name} (${u.email})`;
  if (name) return name;
  if (u.email) return u.email;
  return '—';
}

export default function AdminChatbotPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const fetchAuth = useAuthenticatedFetch();
  const [rows, setRows] = useState<EntryRow[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [conversations, setConversations] = useState<{
    total: number;
    items: ConversationListItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const [convDialogOpen, setConvDialogOpen] = useState(false);
  const [convLoading, setConvLoading] = useState(false);
  const [convDetail, setConvDetail] = useState<ConversationDetailPayload | null>(null);
  const [supportRows, setSupportRows] = useState<SupportRequestRow[]>([]);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportDialogLoading, setSupportDialogLoading] = useState(false);
  const [supportThread, setSupportThread] = useState<SupportThreadPayload | null>(null);
  const [supportReplyText, setSupportReplyText] = useState('');
  const [supportReplySending, setSupportReplySending] = useState(false);
  const [entryEditOpen, setEntryEditOpen] = useState(false);
  const [entryEditLoading, setEntryEditLoading] = useState(false);
  const [entryEditSaving, setEntryEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<EntryEditForm | null>(null);

  const [form, setForm] = useState({
    slug: '',
    title: '',
    question: '',
    answer: '',
    content: '',
    keywordsText: '',
    tagsText: '',
    categoryId: '',
    scope: 'GLOBAL' as 'GLOBAL' | 'CLIENT',
    clientId: '',
    type: 'FAQ' as 'FAQ' | 'ARTICLE',
    priority: '0',
    isPopular: false,
    isFeatured: false,
  });

  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
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
    const entriesUrl = stariumApiPath('/api/platform/chatbot/entries');
    const catUrl = stariumApiPath('/api/platform/chatbot/categories');
    const convUrl = stariumApiPath('/api/platform/chatbot/conversations?limit=100');
    const supportUrl = stariumApiPath('/api/platform/chatbot/support');
    try {
      const [res, catRes, convRes, supRes] = await Promise.all([
        fetchAuth(entriesUrl),
        fetchAuth(catUrl),
        fetchAuth(convUrl),
        fetchAuth(supportUrl),
      ]);
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        setRows(null);
        return;
      }
      setRows((await res.json()) as EntryRow[]);
      if (catRes.ok) {
        setCategories((await catRes.json()) as CategoryRow[]);
      }
      if (convRes.ok) {
        setConversations(await convRes.json());
      } else {
        setConversations(null);
      }
      if (supRes.ok) {
        setSupportRows((await supRes.json()) as SupportRequestRow[]);
      } else {
        setSupportRows([]);
        const detail = (await supRes.text().catch(() => '')).slice(0, 400);
        setErr(
          `Onglet Support : impossible de charger les demandes (${supRes.status})${detail ? ` — ${detail}` : ''}. Vérifiez la session admin plateforme (JWT) et l’URL API.`,
        );
      }
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

  async function createCategory() {
    const name = catForm.name.trim();
    if (!name) {
      setErr('Nom de catégorie requis.');
      return;
    }
    const slug = toSlug(name);
    if (!slug) {
      setErr('Slug dérivé du nom invalide.');
      return;
    }
    setCreatingCat(true);
    setErr(null);
    try {
      const res = await fetchAuth(stariumApiPath('/api/platform/chatbot/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description: catForm.description.trim() || null,
          scope: 'GLOBAL',
          order: 1000,
        }),
      });
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        return;
      }
      setCatForm({ name: '', description: '' });
      await load();
    } finally {
      setCreatingCat(false);
    }
  }

  async function archiveCategory(id: string) {
    const url = stariumApiPath(`/api/platform/chatbot/categories/${id}/archive`);
    const res = await fetchAuth(url, { method: 'PATCH' });
    if (!res.ok) {
      setErr(await res.text().catch(() => res.statusText));
      return;
    }
    await load();
  }

  async function openSupportTicketDialog(auditLogId: string) {
    setSupportDialogOpen(true);
    setSupportDialogLoading(true);
    setSupportThread(null);
    setSupportReplyText('');
    try {
      const res = await fetchAuth(
        stariumApiPath(`/api/platform/chatbot/support/threads/${auditLogId}`),
      );
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        setSupportDialogOpen(false);
        return;
      }
      setSupportThread((await res.json()) as SupportThreadPayload);
    } finally {
      setSupportDialogLoading(false);
    }
  }

  async function submitSupportReply() {
    const ticketId = supportThread?.ticket.id;
    if (!ticketId) return;
    const msg = supportReplyText.trim();
    if (!msg) return;
    setSupportReplySending(true);
    setErr(null);
    try {
      const res = await fetchAuth(
        stariumApiPath(`/api/platform/chatbot/support/threads/${ticketId}/replies`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg }),
        },
      );
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        return;
      }
      setSupportReplyText('');
      const thr = await fetchAuth(
        stariumApiPath(`/api/platform/chatbot/support/threads/${ticketId}`),
      );
      if (thr.ok) {
        setSupportThread((await thr.json()) as SupportThreadPayload);
      }
      const supRes = await fetchAuth(stariumApiPath('/api/platform/chatbot/support'));
      if (supRes.ok) {
        setSupportRows((await supRes.json()) as SupportRequestRow[]);
      }
    } finally {
      setSupportReplySending(false);
    }
  }

  async function openConversationDetail(id: string) {
    setConvDialogOpen(true);
    setConvLoading(true);
    setConvDetail(null);
    try {
      const res = await fetchAuth(
        stariumApiPath(`/api/platform/chatbot/conversations/${id}/messages`),
      );
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        setConvDialogOpen(false);
        return;
      }
      setConvDetail((await res.json()) as ConversationDetailPayload);
    } finally {
      setConvLoading(false);
    }
  }

  function splitListField(text: string): string[] {
    return text
      .split(/[,;\n]+/u)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function createEntry() {
    if (form.scope === 'CLIENT' && !form.clientId.trim()) {
      setErr('Portée CLIENT : renseignez l’identifiant client interne.');
      return;
    }
    setCreating(true);
    setErr(null);
    const kw = splitListField(form.keywordsText);
    const tags = splitListField(form.tagsText);
    const pr = parseInt(form.priority, 10);
    const body: Record<string, unknown> = {
      slug: toSlug(form.title),
      title: form.title.trim(),
      question: form.question.trim(),
      answer: form.answer.trim(),
      scope: form.scope,
      type: form.type,
      categoryId: form.categoryId || null,
      isPopular: form.isPopular,
      isFeatured: form.isFeatured,
    };
    if (form.scope === 'CLIENT') {
      body.clientId = form.clientId.trim() || null;
    }
    if (kw.length) body.keywords = kw;
    if (tags.length) body.tags = tags;
    if (form.content.trim()) body.content = form.content.trim();
    if (Number.isFinite(pr) && pr >= 0) body.priority = pr;
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
        content: '',
        keywordsText: '',
        tagsText: '',
        categoryId: '',
        scope: 'GLOBAL',
        clientId: '',
        type: 'FAQ',
        priority: '0',
        isPopular: false,
        isFeatured: false,
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

  async function openEntryEdit(id: string) {
    setEntryEditOpen(true);
    setEntryEditLoading(true);
    setEditForm(null);
    setErr(null);
    try {
      const res = await fetchAuth(stariumApiPath(`/api/platform/chatbot/entries/${id}`));
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        setEntryEditOpen(false);
        return;
      }
      const e = (await res.json()) as {
        id: string;
        slug: string;
        title: string;
        question: string;
        answer: string;
        content: string | null;
        type: string;
        scope: string;
        clientId: string | null;
        categoryId: string | null;
        keywords?: string[];
        tags?: string[];
        priority?: number;
        isPopular?: boolean;
        isFeatured?: boolean;
      };
      setEditForm({
        id: e.id,
        slug: e.slug,
        title: e.title,
        question: e.question,
        answer: e.answer,
        content: e.content ?? '',
        categoryId: e.categoryId ?? '',
        scope: e.scope === 'CLIENT' ? 'CLIENT' : 'GLOBAL',
        clientId: e.clientId ?? '',
        type: e.type === 'ARTICLE' ? 'ARTICLE' : 'FAQ',
        keywordsText: (e.keywords ?? []).join(', '),
        tagsText: (e.tags ?? []).join(', '),
        priority: String(e.priority ?? 0),
        isPopular: Boolean(e.isPopular),
        isFeatured: Boolean(e.isFeatured),
      });
    } finally {
      setEntryEditLoading(false);
    }
  }

  async function saveEntryEdit() {
    if (!editForm) return;
    if (editForm.scope === 'CLIENT' && !editForm.clientId.trim()) {
      setErr('Portée CLIENT : renseignez l’identifiant client interne.');
      return;
    }
    setEntryEditSaving(true);
    setErr(null);
    try {
      const pr = parseInt(editForm.priority, 10);
      const body: Record<string, unknown> = {
        slug: editForm.slug.trim(),
        title: editForm.title.trim(),
        question: editForm.question.trim(),
        answer: editForm.answer.trim(),
        content: editForm.content.trim() || null,
        type: editForm.type,
        scope: editForm.scope,
        categoryId: editForm.categoryId.trim() || null,
        keywords: splitListField(editForm.keywordsText),
        tags: splitListField(editForm.tagsText),
        isPopular: editForm.isPopular,
        isFeatured: editForm.isFeatured,
      };
      if (Number.isFinite(pr) && pr >= 0) body.priority = pr;
      body.clientId =
        editForm.scope === 'CLIENT' ? editForm.clientId.trim() || null : null;
      const res = await fetchAuth(stariumApiPath(`/api/platform/chatbot/entries/${editForm.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setErr(await res.text().catch(() => res.statusText));
        return;
      }
      setEntryEditOpen(false);
      setEditForm(null);
      await load();
    } finally {
      setEntryEditSaving(false);
    }
  }

  if (authLoading || user?.platformRole !== 'PLATFORM_ADMIN') {
    return authLoading ? (
      <PageContainer>
        <LoadingState rows={4} />
      </PageContainer>
    ) : null;
  }

  const activeCategories = categories.filter((c) => c.archivedAt === null);

  return (
    <PageContainer>
      <PageHeader
        title="Chatbot — administration plateforme"
        description="Catégories, entrées, conversations, support widget (réponses admin + notifs utilisateur)."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/dashboard">Retour plateforme</Link>
          </Button>
        }
      />

      {err && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <LoadingState rows={6} />
      ) : (
        <Tabs defaultValue="categories" className="w-full max-w-5xl">
          <TabsList variant="line" className="mb-6 grid w-full max-w-3xl grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="categories" className="flex-1">
              Catégories
            </TabsTrigger>
            <TabsTrigger value="entries" className="flex-1">
              Entrées
            </TabsTrigger>
            <TabsTrigger value="conversations" className="flex-1">
              Conversations
            </TabsTrigger>
            <TabsTrigger value="support" className="flex-1">
              Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="rounded-lg border border-border/60 p-4 space-y-4">
        <h2 className="text-sm font-semibold">Catégories</h2>
        <p className="text-xs text-muted-foreground">
          À chaque chargement, les catégories <strong>GLOBAL</strong> manquantes sont créées à partir des{' '}
          <strong>modules actifs</strong> (nom + slug dérivé du code). Les catégories que vous archivez ne sont pas
          réactivées automatiquement.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cat-name">Nouvelle catégorie (nom)</Label>
            <Input
              id="cat-name"
              value={catForm.name}
              onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex. : Onboarding"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cat-slug">Slug (auto)</Label>
            <Input id="cat-slug" readOnly value={toSlug(catForm.name)} className="bg-muted/40" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cat-desc">Description (optionnel)</Label>
          <textarea
            id="cat-desc"
            className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={catForm.description}
            onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <Button type="button" disabled={creatingCat} onClick={() => void createCategory()}>
          {creatingCat ? 'Création…' : 'Créer la catégorie (GLOBAL)'}
        </Button>

        {activeCategories.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Portée</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCategories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.slug}</TableCell>
                  <TableCell>{c.scope}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void archiveCategory(c.id)}
                    >
                      Archiver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
          </TabsContent>

          <TabsContent value="entries" className="space-y-6">
      <section className="rounded-lg border border-border/60 p-4 space-y-3 max-w-xl">
        <h2 className="text-sm font-semibold">Créer une entrée</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cb-slug">Slug</Label>
            <Input
              id="cb-slug"
              value={toSlug(form.title)}
              readOnly
              placeholder="généré automatiquement depuis le titre"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cb-title">Titre</Label>
            <Input
              id="cb-title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  title: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cb-category">Catégorie</Label>
          <Select
            value={form.categoryId || '__none__'}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                categoryId: !v || v === '__none__' ? '' : v,
              }))
            }
          >
            <SelectTrigger id="cb-category" size="sm" className="w-full">
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent className="z-[220]">
              <SelectItem value="__none__">Aucune catégorie</SelectItem>
              {activeCategories
                .filter((c) => (form.scope === 'GLOBAL' ? c.scope === 'GLOBAL' : true))
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
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
          <Label htmlFor="cb-a">Réponse</Label>
          <textarea
            id="cb-a"
            className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cb-content">Contenu long (article, optionnel)</Label>
          <textarea
            id="cb-content"
            className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Page détail explorateur…"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cb-kw">Mots-clés (virgules)</Label>
            <Input
              id="cb-kw"
              value={form.keywordsText}
              onChange={(e) => setForm((f) => ({ ...f, keywordsText: e.target.value }))}
              placeholder="ex. : créer projet, onboarding"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cb-tags">Tags (virgules)</Label>
            <Input
              id="cb-tags"
              value={form.tagsText}
              onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="cb-prio">Priorité (matching)</Label>
            <Input
              id="cb-prio"
              type="number"
              min={0}
              className="w-24"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.isPopular}
              onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))}
            />
            Populaire (widget / explore)
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
            />
            À la une (entrée)
          </label>
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

      {rows && (
        <section className="rounded-lg border border-border/60 p-4">
          <h2 className="mb-3 text-sm font-semibold">Entrées existantes</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Portée</TableHead>
              <TableHead>État</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void openEntryEdit(r.id)}
                      >
                        Modifier
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void archive(r.id)}>
                        Archiver
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </section>
      )}
          </TabsContent>

          <TabsContent value="conversations" className="rounded-lg border border-border/60 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Conversations utilisateurs</h2>
        <p className="text-xs text-muted-foreground">
          Messages posés dans le widget Cursor Starium (tous clients). Les libellés affichés sont métier (client, email)
          — pas seulement des identifiants.
        </p>
        {conversations && conversations.items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>MàJ</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead className="text-right">Détail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.client.name}</TableCell>
                  <TableCell className="text-sm">{formatUserLabel(c.user)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {c.title || '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell>{c.messageCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void openConversationDetail(c.id)}
                    >
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune conversation pour le moment.</p>
        )}
          </TabsContent>

          <TabsContent value="support" className="rounded-lg border border-border/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold">Support &amp; retours widget</h2>
            <p className="text-xs text-muted-foreground">
              Tous les envois du formulaire Feedback Cursor Starium (toutes catégories). Les catégories assistance /
              Cursor Starium déclenchent en plus une alerte côté client. Vous pouvez répondre ici : l’utilisateur reçoit
              une notification in-app sur l’organisation concernée.
            </p>
            {supportRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Réponses</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportRows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell className="font-medium">{s.clientName}</TableCell>
                      <TableCell className="max-w-[160px] text-sm">{s.categoryDisplay}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">{s.userDisplay}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {s.pagePath || '—'}
                      </TableCell>
                      <TableCell className="max-w-md text-sm whitespace-pre-wrap">{s.messagePreview}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{s.replyCount ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void openSupportTicketDialog(s.id)}
                        >
                          Répondre
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun retour widget enregistré.</p>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog
        open={convDialogOpen}
        onOpenChange={(open) => {
          setConvDialogOpen(open);
          if (!open) setConvDetail(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] max-w-lg overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Conversation</DialogTitle>
            <DialogDescription>
              Fil des messages tels que vus côté utilisateur (ordre chronologique).
            </DialogDescription>
          </DialogHeader>
          {convLoading && <LoadingState rows={3} />}
          {!convLoading && convDetail && (
            <div className="flex min-h-0 flex-col gap-2 text-sm">
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <p>
                  <span className="text-muted-foreground">Client :</span> {convDetail.conversation.client.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Utilisateur :</span>{' '}
                  {formatUserLabel(convDetail.conversation.user)}
                </p>
                {convDetail.conversation.title ? (
                  <p>
                    <span className="text-muted-foreground">Titre :</span> {convDetail.conversation.title}
                  </p>
                ) : null}
              </div>
              <div className="max-h-[55dvh] space-y-2 overflow-y-auto pr-1">
                {convDetail.messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === 'USER'
                        ? 'ml-6 rounded-lg bg-primary/10 px-3 py-2 text-foreground'
                        : 'mr-6 rounded-lg border border-border/60 bg-card px-3 py-2'
                    }
                  >
                    <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">
                      {m.role === 'USER' ? 'Utilisateur' : 'Assistant'}
                      {m.noAnswerFallbackUsed ? ' · fallback' : ''}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[0.8125rem] leading-relaxed">{m.content}</p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={supportDialogOpen}
        onOpenChange={(open) => {
          setSupportDialogOpen(open);
          if (!open) {
            setSupportThread(null);
            setSupportReplyText('');
          }
        }}
      >
        <DialogContent className="max-h-[88dvh] max-w-lg overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Répondre au retour</DialogTitle>
            <DialogDescription>
              Message initial et fil des réponses équipe plateforme. Envoi = notification à l’auteur sur le client métier.
            </DialogDescription>
          </DialogHeader>
          {supportDialogLoading && <LoadingState rows={3} />}
          {!supportDialogLoading && supportThread && (
            <div className="flex min-h-0 flex-col gap-3 text-sm">
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs space-y-1">
                <p>
                  <span className="text-muted-foreground">Catégorie :</span> {supportThread.ticket.categoryDisplay}
                </p>
                <p>
                  <span className="text-muted-foreground">Auteur :</span> {supportThread.ticket.authorDisplay}
                </p>
                {supportThread.ticket.pagePath ? (
                  <p>
                    <span className="text-muted-foreground">Page :</span>{' '}
                    <span className="font-mono text-[0.7rem]">{supportThread.ticket.pagePath}</span>
                  </p>
                ) : null}
                <p className="text-[0.65rem] text-muted-foreground">
                  {new Date(supportThread.ticket.createdAt).toLocaleString('fr-FR')}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
                <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">Message initial</p>
                <p className="mt-1 whitespace-pre-wrap text-[0.8125rem] leading-relaxed">
                  {supportThread.ticket.message}
                </p>
              </div>
              <div className="max-h-[32dvh] space-y-2 overflow-y-auto pr-1">
                {supportThread.replies.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune réponse plateforme pour l’instant.</p>
                ) : (
                  supportThread.replies.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[0.8125rem]"
                    >
                      <p className="text-[0.65rem] text-muted-foreground">
                        {r.authorDisplay} · {new Date(r.createdAt).toLocaleString('fr-FR')}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <Label htmlFor="support-reply" className="text-xs">
                  Votre réponse
                </Label>
                <textarea
                  id="support-reply"
                  className="min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  value={supportReplyText}
                  onChange={(e) => setSupportReplyText(e.target.value)}
                  placeholder="Réponse visible par l’utilisateur (notification)…"
                  maxLength={8000}
                  disabled={supportReplySending}
                />
                <Button
                  type="button"
                  className="w-full"
                  disabled={supportReplySending || !supportReplyText.trim()}
                  onClick={() => void submitSupportReply()}
                >
                  {supportReplySending ? 'Envoi…' : 'Envoyer la réponse'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={entryEditOpen}
        onOpenChange={(open) => {
          setEntryEditOpen(open);
          if (!open) {
            setEditForm(null);
            setEntryEditLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l’entrée</DialogTitle>
            <DialogDescription>
              Slug, textes, portée, type et catégorie — alignés sur la base Cursor Starium (RFC-AI-001).
            </DialogDescription>
          </DialogHeader>
          {entryEditLoading && <LoadingState rows={4} />}
          {!entryEditLoading && editForm && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="ed-slug">Slug</Label>
                  <Input
                    id="ed-slug"
                    value={editForm.slug}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, slug: e.target.value } : f))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ed-title">Titre</Label>
                  <Input
                    id="ed-title"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, title: e.target.value } : f))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ed-cat">Catégorie</Label>
                <Select
                  value={editForm.categoryId || '__none__'}
                  onValueChange={(v) =>
                    setEditForm((f) =>
                      f ? { ...f, categoryId: !v || v === '__none__' ? '' : v } : f,
                    )
                  }
                >
                  <SelectTrigger id="ed-cat" size="sm" className="w-full">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent className="z-[240]">
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {activeCategories
                      .filter((c) => (editForm.scope === 'GLOBAL' ? c.scope === 'GLOBAL' : true))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ed-q">Question</Label>
                <Input
                  id="ed-q"
                  value={editForm.question}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, question: e.target.value } : f))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ed-a">Réponse (aperçu widget / matching)</Label>
                <textarea
                  id="ed-a"
                  className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  value={editForm.answer}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, answer: e.target.value } : f))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ed-content">Contenu long (article, optionnel)</Label>
                <textarea
                  id="ed-content"
                  className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  value={editForm.content}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, content: e.target.value } : f))}
                  placeholder="Markdown ou texte pour la page détail explorateur…"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="ed-kw">Mots-clés (séparés par virgule)</Label>
                  <Input
                    id="ed-kw"
                    value={editForm.keywordsText}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, keywordsText: e.target.value } : f))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ed-tags">Tags (séparés par virgule)</Label>
                  <Input
                    id="ed-tags"
                    value={editForm.tagsText}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, tagsText: e.target.value } : f))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label htmlFor="ed-prio">Priorité</Label>
                  <Input
                    id="ed-prio"
                    type="number"
                    min={0}
                    className="w-24"
                    value={editForm.priority}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, priority: e.target.value } : f))}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={editForm.isPopular}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, isPopular: e.target.checked } : f))
                    }
                  />
                  Populaire
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={editForm.isFeatured}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, isFeatured: e.target.checked } : f))
                    }
                  />
                  À la une
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-muted-foreground">Portée</span>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="ed-scope"
                    checked={editForm.scope === 'GLOBAL'}
                    onChange={() => setEditForm((f) => (f ? { ...f, scope: 'GLOBAL' } : f))}
                  />
                  GLOBAL
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="ed-scope"
                    checked={editForm.scope === 'CLIENT'}
                    onChange={() => setEditForm((f) => (f ? { ...f, scope: 'CLIENT' } : f))}
                  />
                  CLIENT
                </label>
                {editForm.scope === 'CLIENT' && (
                  <Input
                    className="max-w-xs"
                    placeholder="ID client (interne)"
                    value={editForm.clientId}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, clientId: e.target.value } : f))}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="ed-type"
                    checked={editForm.type === 'FAQ'}
                    onChange={() => setEditForm((f) => (f ? { ...f, type: 'FAQ' } : f))}
                  />
                  FAQ
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="ed-type"
                    checked={editForm.type === 'ARTICLE'}
                    onChange={() => setEditForm((f) => (f ? { ...f, type: 'ARTICLE' } : f))}
                  />
                  ARTICLE
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={entryEditSaving}
                  onClick={() => {
                    setEntryEditOpen(false);
                    setEditForm(null);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={entryEditSaving}
                  onClick={() => void saveEntryEdit()}
                >
                  {entryEditSaving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
