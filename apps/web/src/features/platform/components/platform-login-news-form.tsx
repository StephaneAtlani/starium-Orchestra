'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertOctagon, AlertTriangle, Info, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  formatLoginNewsDatetimeLocal,
  LOGIN_NEWS_MESSAGE_TYPE_LABEL,
  loginNewsDatetimeLocalToIso,
  type LoginNewsMessageType,
} from '@/services/login-news';

const MAX_LENGTH = 500;

const MESSAGE_TYPE_OPTIONS: LoginNewsMessageType[] = [
  'INFORMATION',
  'WARNING',
  'URGENT',
];

type PlatformLoginNewsGetResponse = {
  id: string;
  message: string | null;
  messageType: LoginNewsMessageType;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string | null;
};

function previewAlertClass(messageType: LoginNewsMessageType): string {
  switch (messageType) {
    case 'WARNING':
      return 'rounded-[var(--radius-lg,14px)] border-[color:var(--state-warning)] bg-[color-mix(in_srgb,var(--state-warning-bg)_72%,var(--color-surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--state-warning)_25%,transparent)]';
    case 'URGENT':
      return 'rounded-[var(--radius-lg,14px)] border-[color:var(--state-danger)] bg-[color-mix(in_srgb,var(--state-danger)_14%,var(--color-surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--state-danger)_22%,transparent)]';
    case 'INFORMATION':
    default:
      return 'rounded-[var(--radius-lg,14px)] border-[color:var(--purple)] bg-[color-mix(in_srgb,var(--purple-bg)_70%,var(--color-surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--purple)_18%,transparent)]';
  }
}

function PreviewIcon({ messageType }: { messageType: LoginNewsMessageType }) {
  switch (messageType) {
    case 'WARNING':
      return <AlertTriangle className="size-4 text-[color:var(--state-warning)]" aria-hidden />;
    case 'URGENT':
      return <AlertOctagon className="size-4 text-[color:var(--state-danger)]" aria-hidden />;
    case 'INFORMATION':
    default:
      return <Info className="size-4 text-[color:var(--purple)]" aria-hidden />;
  }
}

export function PlatformLoginNewsForm() {
  const authFetch = useAuthenticatedFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<LoginNewsMessageType>('INFORMATION');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');
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
      setMessageType(data.messageType ?? 'INFORMATION');
      setStartsAtLocal(formatLoginNewsDatetimeLocal(data.startsAt));
      setEndsAtLocal(formatLoginNewsDatetimeLocal(data.endsAt));
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

  function buildPayload() {
    const trimmed = message.trim();
    return {
      message: trimmed.length > 0 ? trimmed : null,
      messageType,
      startsAt: loginNewsDatetimeLocalToIso(startsAtLocal),
      endsAt: loginNewsDatetimeLocalToIso(endsAtLocal),
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await authFetch('/api/platform/login-news', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { message?: string | string[] }
          | null;
        const msg = Array.isArray(err?.message)
          ? err.message[0]
          : err?.message;
        toast.error(
          typeof msg === 'string' && msg.length > 0
            ? msg
            : 'Enregistrement impossible.',
        );
        return;
      }
      const data = (await res.json()) as PlatformLoginNewsGetResponse;
      setMessage(data.message ?? '');
      setMessageType(data.messageType ?? 'INFORMATION');
      setStartsAtLocal(formatLoginNewsDatetimeLocal(data.startsAt));
      setEndsAtLocal(formatLoginNewsDatetimeLocal(data.endsAt));
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
    setStartsAtLocal('');
    setEndsAtLocal('');
    setSaving(true);
    try {
      const res = await authFetch('/api/platform/login-news', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: null,
          messageType,
          startsAt: null,
          endsAt: null,
        }),
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
        description="Publiez un message visible sur le panneau de marque de la page de connexion. Choisissez le type et, si besoin, une fenêtre d’affichage (début / fin)."
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
              Texte court (maintenance, nouveauté, alerte). Les dates de début et de fin sont
              optionnelles : sans dates, le message reste affiché tant qu’il est publié.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-news-type">Type de message</Label>
              <Select
                value={messageType}
                onValueChange={(value) => setMessageType(value as LoginNewsMessageType)}
              >
                <SelectTrigger id="login-news-type" className="min-h-11 w-full max-w-sm">
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {LOGIN_NEWS_MESSAGE_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="login-news-starts-at">Date et heure de début</Label>
                <Input
                  id="login-news-starts-at"
                  type="datetime-local"
                  value={startsAtLocal}
                  onChange={(e) => setStartsAtLocal(e.target.value)}
                  className="min-h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Optionnel — laisser vide pour afficher immédiatement.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-news-ends-at">Date et heure de fin</Label>
                <Input
                  id="login-news-ends-at"
                  type="datetime-local"
                  value={endsAtLocal}
                  onChange={(e) => setEndsAtLocal(e.target.value)}
                  className="min-h-11"
                  min={startsAtLocal || undefined}
                />
                <p className="text-xs text-muted-foreground">
                  Optionnel — laisser vide pour ne pas limiter la durée.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-news-message">Contenu</Label>
              <Textarea
                id="login-news-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                rows={5}
                maxLength={MAX_LENGTH}
                placeholder="Ex. : Maintenance planifiée — merci pour votre compréhension."
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

            <Alert className={previewAlertClass(messageType)}>
              <PreviewIcon messageType={messageType} />
              <AlertTitle>{LOGIN_NEWS_MESSAGE_TYPE_LABEL[messageType]}</AlertTitle>
              <AlertDescription className="space-y-2">
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
                disabled={saving || (message.trim().length === 0 && !startsAtLocal && !endsAtLocal)}
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
