'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';

type ProcurementStorageDriverApi = 'LOCAL' | 'S3';

type PlatformProcurementStorageGetResponse = {
  id: string;
  enabled: boolean;
  storageDriver: ProcurementStorageDriverApi;
  localRoot: string | null;
  endpoint: string | null;
  region: string | null;
  accessKey: string | null;
  hasSecret: boolean;
  bucket: string | null;
  /** Préfixe des noms de bucket S3 créés par client (documents). */
  clientDocumentsBucketPrefix: string | null;
  useSsl: boolean;
  forcePathStyle: boolean;
  updatedAt: string;
  effectiveSource: 'db' | 'env' | 'none';
  effectiveDriver: 'local' | 's3';
  effectiveLocalRootSource: 'env' | 'db' | 'none';
};

function storageDriverFormLabel(driver: ProcurementStorageDriverApi): string {
  return driver === 'LOCAL'
    ? 'Disque sur le serveur (dossier local)'
    : 'Stockage objet compatible S3';
}

function effectiveDriverLabel(d: 'local' | 's3'): string {
  return d === 'local' ? 'Disque local' : 'Stockage objet (S3)';
}

function effectiveSourceLabel(s: 'db' | 'env' | 'none'): string {
  if (s === 'db') return 'Configuration enregistrée (base)';
  if (s === 'env') return 'Variables d’environnement sur l’API';
  return 'Non configuré';
}

function effectiveLocalRootSourceLabel(s: 'env' | 'db' | 'none'): string {
  if (s === 'env') return 'Variable PROCUREMENT_LOCAL_ROOT';
  if (s === 'db') return 'Champ « Racine locale » ci-dessous (avec option activée)';
  return 'Non défini';
}

function dbDriverMatchesEffective(
  storageDriver: ProcurementStorageDriverApi,
  effectiveDriver: 'local' | 's3',
): boolean {
  const want =
    storageDriver === 'LOCAL' ? 'local' : ('s3' as const);
  return want === effectiveDriver;
}

async function describeLoadFailure(res: Response): Promise<string> {
  let apiMsg = '';
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (body?.message) {
      apiMsg = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
    }
  } catch {
    /* ignore */
  }
  switch (res.status) {
    case 401:
      return 'Session expirée. Reconnectez-vous.';
    case 403:
      return (
        apiMsg ||
        'Accès refusé : administrateur plateforme requis.'
      );
    default:
      return apiMsg || `Chargement impossible (HTTP ${res.status}).`;
  }
}

export function PlatformProcurementStorageSettingsForm() {
  const authFetch = useAuthenticatedFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<{
    effectiveDriver: 'local' | 's3';
    effectiveSource: 'db' | 'env' | 'none';
    effectiveLocalRootSource: 'env' | 'db' | 'none';
    storageDriver: ProcurementStorageDriverApi;
  } | null>(null);

  const [form, setForm] = useState({
    enabled: false,
    storageDriver: 'S3' as ProcurementStorageDriverApi,
    localRoot: '',
    endpoint: '',
    region: '',
    accessKey: '',
    secretKey: '',
    bucket: '',
    clientDocumentsBucketPrefix: '',
    useSsl: true,
    forcePathStyle: true,
  });
  const [hasSecretStored, setHasSecretStored] = useState(false);
  const [removeSecret, setRemoveSecret] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/platform/procurement-s3-settings');
      if (!res.ok) {
        toast.error(await describeLoadFailure(res));
        return;
      }
      const data = (await res.json()) as PlatformProcurementStorageGetResponse;
      setMeta({
        effectiveDriver: data.effectiveDriver,
        effectiveSource: data.effectiveSource,
        effectiveLocalRootSource: data.effectiveLocalRootSource,
        storageDriver: data.storageDriver,
      });
      setHasSecretStored(data.hasSecret);
      setRemoveSecret(false);
      setForm({
        enabled: data.enabled,
        storageDriver: data.storageDriver,
        localRoot: data.localRoot ?? '',
        endpoint: data.endpoint ?? '',
        region: data.region ?? '',
        accessKey: data.accessKey ?? '',
        secretKey: '',
        bucket: data.bucket ?? '',
        clientDocumentsBucketPrefix: data.clientDocumentsBucketPrefix ?? '',
        useSsl: data.useSsl,
        forcePathStyle: data.forcePathStyle,
      });
    } catch (e) {
      if (e instanceof TypeError) {
        toast.error(
          'Impossible de joindre l’API. Vérifiez que le backend est démarré.',
        );
      } else {
        toast.error('Impossible de charger la configuration stockage procurement.');
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const envOverridesDriver = useMemo(
    () =>
      meta
        ? !dbDriverMatchesEffective(meta.storageDriver, meta.effectiveDriver)
        : false,
    [meta],
  );

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        enabled: form.enabled,
        storageDriver: form.storageDriver,
        localRoot: form.localRoot.trim() || null,
        endpoint: form.endpoint.trim() || null,
        region: form.region.trim() || null,
        accessKey: form.accessKey.trim() || null,
        bucket: form.bucket.trim() || null,
        clientDocumentsBucketPrefix: form.clientDocumentsBucketPrefix.trim() || null,
        useSsl: form.useSsl,
        forcePathStyle: form.forcePathStyle,
      };
      if (form.secretKey.trim()) {
        body.secretKey = form.secretKey.trim();
      } else if (removeSecret) {
        body.secretKey = '';
      }

      const res = await authFetch('/api/platform/procurement-s3-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const raw = errBody?.message;
        const msg = Array.isArray(raw)
          ? raw.join(', ')
          : raw ?? 'Enregistrement refusé';
        throw new Error(msg);
      }
      toast.success('Configuration enregistrée.');
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Stockage des pièces jointes (procurement)"
        description="Choix entre fichiers sur le serveur Starium ou stockage objet S3 (AWS, MinIO, etc.). Les utilisateurs métier continuent de passer uniquement par l’API pour upload et téléchargement."
      />

      {meta && (
        <Card className="mb-6 max-w-2xl border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comportement actuel</CardTitle>
            <CardDescription>
              Après application des variables d’environnement sur l’API, le type
              effectivement utilisé est indiqué ci-dessous.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Type effectif : </span>
              {effectiveDriverLabel(meta.effectiveDriver)}
            </p>
            {meta.effectiveDriver === 's3' && (
              <p>
                <span className="font-medium">Config S3 résolue depuis : </span>
                {effectiveSourceLabel(meta.effectiveSource)}
              </p>
            )}
            {meta.effectiveDriver === 'local' && (
              <p>
                <span className="font-medium">Racine locale résolue depuis : </span>
                {effectiveLocalRootSourceLabel(meta.effectiveLocalRootSource)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {envOverridesDriver && meta && (
        <Alert className="mb-6 max-w-2xl">
          <Info className="size-4" />
          <AlertTitle>Variable d’environnement prioritaire</AlertTitle>
          <AlertDescription>
            La préférence enregistrée en base est «{' '}
            {storageDriverFormLabel(meta.storageDriver)} », mais l’API utilise «{' '}
            {effectiveDriverLabel(meta.effectiveDriver)} » car{' '}
            <code className="rounded bg-muted px-1 text-xs">
              PROCUREMENT_STORAGE_DRIVER
            </code>{' '}
            est défini sur le serveur. Retirez ou ajustez cette variable pour que
            le choix ci-dessous s’applique au runtime.
          </AlertDescription>
        </Alert>
      )}

      {meta?.effectiveLocalRootSource === 'env' && meta.effectiveDriver === 'local' && (
        <Alert className="mb-6 max-w-2xl">
          <Info className="size-4" />
          <AlertTitle>Racine locale fournie par l’environnement</AlertTitle>
          <AlertDescription>
            La variable{' '}
            <code className="rounded bg-muted px-1 text-xs">PROCUREMENT_LOCAL_ROOT</code>{' '}
            sur l’API prime sur le champ « Racine locale » en base.
          </AlertDescription>
        </Alert>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Configuration enregistrée</CardTitle>
          <CardDescription>
            Réservé aux administrateurs plateforme. Les clés secrètes ne sont jamais
            renvoyées en lecture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
            <div className="space-y-0.5">
              <Label>Activer la configuration en base</Label>
              <p className="text-xs text-muted-foreground">
                <strong className="font-medium text-foreground">Requis</strong> pour que
                l’API applique les paramètres S3 / disque saisis ici (buckets clients,
                pièces jointes). Si désactivé, seules les variables{' '}
                <code className="rounded bg-muted px-1 text-[0.7rem]">PROCUREMENT_S3_*</code>{' '}
                sur le serveur sont prises en compte (sinon pas de S3).
              </p>
            </div>
            <Switch
              aria-label="Activer la configuration en base"
              checked={form.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proc-storage-driver">Type de stockage</Label>
            <Select
              value={form.storageDriver}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  storageDriver: v as ProcurementStorageDriverApi,
                }))
              }
            >
              <SelectTrigger id="proc-storage-driver" className="max-w-md">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOCAL">
                  {storageDriverFormLabel('LOCAL')}
                </SelectItem>
                <SelectItem value="S3">
                  {storageDriverFormLabel('S3')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.storageDriver === 'LOCAL' && (
            <div className="space-y-2">
              <Label htmlFor="proc-local-root">Racine locale (chemin sur le serveur)</Label>
              <Input
                id="proc-local-root"
                value={form.localRoot}
                onChange={(e) =>
                  setForm((f) => ({ ...f, localRoot: e.target.value }))
                }
                placeholder="/var/lib/starium/procurement-blobs"
              />
              <p className="text-xs text-muted-foreground">
                Utilisé lorsque l’option est activée et que{' '}
                <code className="text-xs">PROCUREMENT_LOCAL_ROOT</code> n’est pas défini
                sur l’API.
              </p>
            </div>
          )}

          {form.storageDriver === 'S3' && (
            <div className="space-y-4 rounded-lg border border-dashed p-4">
              <p className="text-sm font-medium">Paramètres S3</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="proc-s3-endpoint">Endpoint (optionnel pour AWS)</Label>
                  <Input
                    id="proc-s3-endpoint"
                    value={form.endpoint}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endpoint: e.target.value }))
                    }
                    placeholder="Vide = AWS selon la région ; ou http://minio:9000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pour <strong>Amazon S3</strong>, laissez vide et renseignez uniquement la
                    région (ex. eu-west-3). Pour <strong>MinIO</strong>, indiquez l’URL du
                    service (ex. http://minio:9000) et activez le path-style ci-dessous.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proc-s3-region">Région</Label>
                  <Input
                    id="proc-s3-region"
                    value={form.region}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, region: e.target.value }))
                    }
                    placeholder="eu-west-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proc-s3-bucket">Bucket (plateforme / compat)</Label>
                  <Input
                    id="proc-s3-bucket"
                    value={form.bucket}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bucket: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="proc-s3-client-bucket-prefix">
                    Préfixe buckets par client (hérité)
                  </Label>
                  <Input
                    id="proc-s3-client-bucket-prefix"
                    value={form.clientDocumentsBucketPrefix}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        clientDocumentsBucketPrefix: e.target.value,
                      }))
                    }
                    placeholder=""
                  />
                  <p className="text-xs text-muted-foreground">
                    Non utilisé : les pièces sont dans le **bucket ci-dessus**, sous un préfixe par
                    client (<code className="text-xs">{'{clientId}'}</code> / Commandes, Factures,
                    Contrats).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proc-s3-access">Clé d’accès</Label>
                  <Input
                    id="proc-s3-access"
                    value={form.accessKey}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accessKey: e.target.value }))
                    }
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proc-s3-secret">Secret</Label>
                  <Input
                    id="proc-s3-secret"
                    type="password"
                    value={form.secretKey}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, secretKey: e.target.value }))
                    }
                    placeholder={hasSecretStored ? '•••• laisser vide pour ne pas changer' : ''}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {hasSecretStored && (
                <div className="flex items-center justify-between gap-4 rounded-md bg-muted/40 px-3 py-2">
                  <Label className="text-sm font-normal">Retirer le secret stocké</Label>
                  <Switch
                    aria-label="Retirer le secret stocké"
                    checked={removeSecret}
                    onCheckedChange={(v) => {
                      setRemoveSecret(v);
                      if (v) setForm((f) => ({ ...f, secretKey: '' }));
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-4 sm:justify-start">
                  <Label className="text-sm font-normal">HTTPS (SSL)</Label>
                  <Switch
                    aria-label="HTTPS SSL pour S3"
                    checked={form.useSsl}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, useSsl: v }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-start">
                  <div>
                    <Label className="text-sm font-normal">Path-style (MinIO)</Label>
                    <p className="text-xs text-muted-foreground">
                      À activer pour MinIO ; à laisser <strong>désactivé</strong> pour AWS.
                    </p>
                  </div>
                  <Switch
                    aria-label="Path-style URLs pour S3"
                    checked={form.forcePathStyle}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, forcePathStyle: v }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
