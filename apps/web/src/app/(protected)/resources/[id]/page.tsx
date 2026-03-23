'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getResource, updateResource } from '@/services/resources';

export default function ResourceDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await getResource(authFetch, id);
        if (!cancelled) {
          setName(r.name);
        }
      } catch {
        if (!cancelled) setError('Ressource introuvable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateResource(authFetch, id, { name: name.trim() });
      router.refresh();
    } catch {
      setError('Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Fiche ressource"
          description="Détail et édition (MVP)."
          actions={
            <Link href="/resources" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              Liste
            </Link>
          }
        />
        {loading && <LoadingState rows={2} />}
        {error && !loading && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && (
          <form onSubmit={onSave} className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={1}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
