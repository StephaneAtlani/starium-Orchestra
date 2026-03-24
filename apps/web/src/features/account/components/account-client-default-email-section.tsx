'use client';

import React from 'react';
import {
  useEmailIdentitiesQuery,
  useMeClientsQuery,
  useSetDefaultEmailIdentityMutation,
} from '@/features/account/hooks/use-me-email-queries';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MeClient } from '@/services/me';

const NONE = '__none__';

function formatIdentityLabel(
  email: string,
  displayName: string | null | undefined,
): string {
  const dn = displayName?.trim();
  return dn ? `${email} — ${dn}` : email;
}

function ClientEmailRow({
  client,
  activeIdentities,
}: {
  client: MeClient;
  activeIdentities: { id: string; email: string; displayName: string | null }[];
}) {
  const setDefaultMut = useSetDefaultEmailIdentityMutation();

  const validIds = new Set(activeIdentities.map((i) => i.id));
  const selectValue =
    client.defaultEmailIdentityId &&
    validIds.has(client.defaultEmailIdentityId)
      ? client.defaultEmailIdentityId
      : NONE;

  function onValueChange(v: string | null) {
    if (!v || v === NONE) return;
    if (v === client.defaultEmailIdentityId) return;
    void setDefaultMut.mutateAsync({
      clientId: client.id,
      emailIdentityId: v,
    });
  }

  if (activeIdentities.length === 0) {
    return (
      <li className="px-4 py-4">
        <p className="text-sm font-medium text-foreground">{client.name}</p>
        <p className="mt-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Aucune adresse active. Ajoutez des adresses dans la section
          « Adresses e-mail » ci-dessus.
        </p>
      </li>
    );
  }

  const def = client.defaultEmailIdentity;

  return (
    <li className="px-4 py-4 sm:flex sm:items-start sm:gap-6">
      <div className="mb-3 min-w-0 shrink-0 sm:mb-0 sm:w-44">
        <p className="text-sm font-semibold leading-snug text-foreground">
          {client.name}
        </p>
        {def && !def.isVerified ? (
          <Badge
            variant="outline"
            className="mt-2 border-primary/20 bg-accent/60 font-normal text-accent-foreground dark:bg-accent/25"
          >
            Identité non vérifiée
          </Badge>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Select value={selectValue} onValueChange={onValueChange}>
          <SelectTrigger
            className="w-full"
            aria-label={`E-mail affiché pour ${client.name}`}
          >
            <SelectValue>
              {selectValue === NONE
                ? 'Choisir une adresse…'
                : formatIdentityLabel(
                    activeIdentities.find((i) => i.id === selectValue)?.email ??
                      '',
                    activeIdentities.find((i) => i.id === selectValue)
                      ?.displayName ?? null,
                  )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Choisir une adresse…</SelectItem>
            {activeIdentities.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {formatIdentityLabel(i.email, i.displayName)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {setDefaultMut.isPending ? (
          <p className="text-xs text-muted-foreground">Enregistrement…</p>
        ) : null}
      </div>
    </li>
  );
}

export function AccountClientDefaultEmailSection() {
  const { data: clients, isLoading, error, refetch } = useMeClientsQuery();
  const { data: identities } = useEmailIdentitiesQuery();

  const clientList = clients ?? [];
  const identityList = identities ?? [];

  const activeClients = clientList.filter((c) => c.status === 'ACTIVE');
  const activeIdentities = identityList.filter((i) => i.isActive);

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle>E-mail affiché par client</CardTitle>
        <CardDescription>
          Adresse utilisée par défaut pour l’affichage (et plus tard pour
          l’envoi) lorsque ce client est concerné.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 px-0 pt-0">
        {error && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3" role="alert">
            <span className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Erreur'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
            >
              Réessayer
            </Button>
          </div>
        )}
        {isLoading && clientList.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Chargement…
          </p>
        ) : null}
        {!isLoading && activeClients.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun client actif.
          </p>
        ) : null}
        {activeClients.length > 0 ? (
          <ul className="divide-y divide-border/50">
            {activeClients.map((client) => (
              <ClientEmailRow
                key={client.id}
                client={client}
                activeIdentities={activeIdentities}
              />
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
