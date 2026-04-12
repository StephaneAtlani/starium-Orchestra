'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';

type PlatformUploadGetResponse = {
  id: string;
  maxUploadBytes: number;
  minUploadBytes: number;
  maxUploadBytesCeiling: number;
  updatedAt: string;
};

function bytesToMiB(n: number): string {
  const v = n / (1024 * 1024);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.?0+$/, '');
}

function miBToBytes(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1024 * 1024);
}

export function PlatformUploadSettingsForm() {
  const authFetch = useAuthenticatedFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<{
    minUploadBytes: number;
    maxUploadBytesCeiling: number;
  } | null>(null);
  const [maxMiBInput, setMaxMiBInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/platform/upload-settings');
      if (!res.ok) {
        toast.error('Impossible de charger les paramètres d’upload.');
        return;
      }
      const data = (await res.json()) as PlatformUploadGetResponse;
      setMeta({
        minUploadBytes: data.minUploadBytes,
        maxUploadBytesCeiling: data.maxUploadBytesCeiling,
      });
      setMaxMiBInput(bytesToMiB(data.maxUploadBytes));
    } catch {
      toast.error('Impossible de joindre l’API.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedBytes = useMemo(
    () => miBToBytes(maxMiBInput),
    [maxMiBInput],
  );

  const validationError = useMemo(() => {
    if (meta == null || parsedBytes == null) {
      return parsedBytes === null && maxMiBInput.trim() !== ''
        ? 'Valeur numérique invalide.'
        : null;
    }
    if (parsedBytes < meta.minUploadBytes) {
      return `Minimum : ${bytesToMiB(meta.minUploadBytes)} Mo.`;
    }
    if (parsedBytes > meta.maxUploadBytesCeiling) {
      return `Maximum autorisé sur cette installation : ${bytesToMiB(meta.maxUploadBytesCeiling)} Mo (plafond d’exploitation).`;
    }
    return null;
  }, [meta, parsedBytes, maxMiBInput]);

  const save = async () => {
    if (meta == null || parsedBytes == null || validationError) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/platform/upload-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUploadBytes: parsedBytes }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const m = body?.message;
        toast.error(
          typeof m === 'string'
            ? m
            : Array.isArray(m)
              ? m.join(', ')
              : 'Enregistrement refusé.',
        );
        return;
      }
      toast.success('Taille maximale enregistrée.');
      await load();
    } catch {
      toast.error('Erreur réseau à l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Taille maximale des fichiers"
        description="Plafond pour les imports budgétaires et les pièces jointes procurement (PDF, images). Les avatars et logos fournisseurs restent sur des limites fixes plus basses."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Réglage plateforme</CardTitle>
          <CardDescription>
            Valeur en mébioctets (Mo) ; appliquée immédiatement après enregistrement (sans redémarrage).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="default" className="border-border/70 bg-muted/25">
            <AlertTitle className="text-sm">Périmètre</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              Import de fichiers budget (analyse) et pièces jointes commandes / factures
              procurement partagent cette limite.
            </AlertDescription>
          </Alert>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Chargement…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="max-upload-mib">Taille maximale (Mo)</Label>
                <Input
                  id="max-upload-mib"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={maxMiBInput}
                  onChange={(e) => setMaxMiBInput(e.target.value)}
                  className="max-w-xs"
                />
                {meta ? (
                  <p className="text-xs text-muted-foreground">
                    Bornes : {bytesToMiB(meta.minUploadBytes)} —{' '}
                    {bytesToMiB(meta.maxUploadBytesCeiling)} Mo. Pour augmenter le plafond
                    absolu, définir la variable d’environnement{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">
                      PLATFORM_UPLOAD_MAX_BYTES_CEILING
                    </code>{' '}
                    sur l’API (octets), puis redémarrer.
                  </p>
                ) : null}
                {validationError ? (
                  <p className="text-sm text-destructive">{validationError}</p>
                ) : null}
              </div>
              <Button
                type="button"
                onClick={() => void save()}
                disabled={
                  saving || parsedBytes == null || Boolean(validationError)
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
