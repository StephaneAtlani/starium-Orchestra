'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';

const MAX_LENGTH = 500;

type PlatformLoginNewsGetResponse = {
  id: string;
  message: string | null;
  updatedAt: string | null;
};

export function PlatformLoginNewsForm() {
  const authFetch = useAuthenticatedFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/platform/login-news');
      if (!res.ok) {
        toast.error('Impossible de charger le message de connexion.');
        return;
      }
      const data = (await res.json()) as PlatformLoginNewsGetResponse;
      setMessage(data.message ?? '');
      setUpdatedAt(data.updatedAt);
    } catch {
      toast.error('Impossible de joindre l’API.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const trimmed = message.trim();
      const res = await authFetch('/api/platform/login-news', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed.length > 0 ? trimmed : null }),
      });
      if (!res.ok) {
        toast.error('Enregistrement impossible.');
        return;
      }
      const data = (await res.json()) as PlatformLoginNewsGetResponse;
      setMessage(data.message ?? '');
      setUpdatedAt(data.updatedAt);
      toast.success(
        data.message
          ? 'Message publié sur l’écran de connexion.'
          : 'Message retiré de l’écran de connexion.',
      );
    } catch {
      toast.error('Impossible de joindre l’API.');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setMessage('');
    setSaving(true);
    try {
      const res = await authFetch('/api/platform/login-news', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: null }),
      });
      if (!res.ok) {
        toast.error('Suppression impossible.');
        return;
      }
      const data = (await res.json()) as PlatformLoginNewsGetResponse;
      setUpdatedAt(data.updatedAt);
      toast.success('Message retiré de l’écran de connexion.');
    } catch {
      toast.error('Impossible de joindre l’API.');
    } finally {
      setSaving(false);
    }
  }

  const remaining = MAX_LENGTH - message.length;

  return (
    <PageContainer>
      <PageHeader
        title="Actualité — écran de connexion"
        description="Publiez un message visible sur le panneau de marque de la page de connexion. Laissez vide pour ne rien afficher."
      />

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Message</CardTitle>
            <CardDescription>
              Texte court (maintenance, nouveauté, information générale). Aucun message
              enregistré = rien n’est affiché côté login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-news-message">Contenu</Label>
              <Textarea
                id="login-news-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                rows={5}
                maxLength={MAX_LENGTH}
                placeholder="Ex. : Maintenance planifiée samedi 22h–00h."
                className="min-h-[8rem] resize-y"
              />
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {remaining} caractère{remaining !== 1 ? 's' : ''} restant
                {remaining !== 1 ? 's' : ''}
              </p>
            </div>

            {updatedAt ? (
              <p className="text-xs text-muted-foreground">
                Dernière modification :{' '}
                <time dateTime={updatedAt}>
                  {new Date(updatedAt).toLocaleString('fr-FR')}
                </time>
              </p>
            ) : null}

            <Alert>
              <AlertTitle>Aperçu</AlertTitle>
              <AlertDescription>
                {message.trim() ? (
                  <span className="whitespace-pre-wrap">{message.trim()}</span>
                ) : (
                  'Aucun message — l’écran de connexion reste inchangé.'
                )}
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                aria-busy={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Enregistrement…
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleClear()}
                disabled={saving || message.trim().length === 0}
              >
                Retirer le message
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
