'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PermissionGate } from '@/components/PermissionGate';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

/** Quelques codes connus pour tester PermissionGate (affichage conditionnel). */
const SAMPLE_GATES = [
  { code: 'projects.read', label: 'projects.read' },
  { code: 'projects.update', label: 'projects.update' },
  { code: 'budgets.read', label: 'budgets.read' },
  { code: 'budgets.update', label: 'budgets.update' },
  { code: 'clients.update', label: 'clients.update' },
] as const;

export default function RbacTestPage() {
  const { user } = useAuth();
  const { activeClient } = useActiveClient();
  const {
    permissionCodes,
    has,
    isLoading,
    isSuccess,
    isError,
  } = usePermissions();

  const sortedCodes = useMemo(
    () => [...permissionCodes].sort((a, b) => a.localeCompare(b, 'fr')),
    [permissionCodes],
  );

  return (
    <PageContainer>
      <PageHeader
        title="RBAC (dev)"
        description="Diagnostic local : utilisateur, client actif et permissions renvoyées par GET /api/me/permissions. À ne pas exposer en production sans garde-fou."
      />

      <Alert variant="default" className="border-amber-500/40 bg-amber-500/5">
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle>Outil de développement</AlertTitle>
        <AlertDescription>
          Cette route sert à vérifier les codes effectifs pour le client actif. Elle est exclue du
          bootstrap « client obligatoire » comme les routes /admin pour permettre aux platform
          admins d’y accéder sans contexte client.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Utilisateur</CardTitle>
            <CardDescription>Session (auth context)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">E-mail : </span>
              <span className="font-mono text-xs">{user?.email ?? '—'}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Rôle plateforme : </span>
              {user?.platformRole ? (
                <Badge variant="secondary">{user.platformRole}</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Client actif</CardTitle>
            <CardDescription>Nécessaire pour charger les permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {activeClient ? (
              <>
                <p>
                  <span className="text-muted-foreground">Nom : </span>
                  {activeClient.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Slug : </span>
                  <span className="font-mono text-xs">{activeClient.slug}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Id : </span>
                  <span className="break-all font-mono text-[11px]">{activeClient.id}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Rôle : </span>
                  <Badge variant="outline">{activeClient.role}</Badge>
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Aucun client actif. Sélectionne un client (menu ou /select-client) pour charger{' '}
                <code className="text-xs">permissionCodes</code>.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Permissions (client actif)</CardTitle>
          <CardDescription>
            Source : <code className="text-xs">usePermissions()</code> → GET /api/me/permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!activeClient && (
            <p className="text-muted-foreground text-sm">—</p>
          )}
          {activeClient && isLoading && <LoadingState rows={4} />}
          {activeClient && isError && (
            <p className="text-destructive text-sm">Erreur lors du chargement des permissions.</p>
          )}
          {activeClient && isSuccess && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                <span className="font-medium text-foreground">{sortedCodes.length}</span> code(s)
              </p>
              {sortedCodes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune permission (jeu vide).</p>
              ) : (
                <ul className="max-h-[min(50vh,28rem)] list-inside list-disc space-y-1 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
                  {sortedCodes.map((code) => (
                    <li key={code}>{code}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">PermissionGate (échantillon)</CardTitle>
          <CardDescription>
            Affichage si <code className="text-xs">has(code)</code> est vrai
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!activeClient && (
            <p className="text-muted-foreground text-sm">Nécessite un client actif.</p>
          )}
          {activeClient && !isSuccess && isLoading && (
            <p className="text-muted-foreground text-sm">Chargement…</p>
          )}
          {activeClient && isSuccess &&
            SAMPLE_GATES.map(({ code, label }) => (
              <div
                key={code}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <code className="text-xs">{label}</code>
                <PermissionGate permission={code}>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">autorisé</Badge>
                </PermissionGate>
                {!has(code) && <Badge variant="secondary">refusé</Badge>}
              </div>
            ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
