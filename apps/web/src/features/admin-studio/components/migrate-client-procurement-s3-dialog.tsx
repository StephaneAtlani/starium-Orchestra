'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { AdminClientSummary } from '../types/admin-studio.types';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useQueryClient } from '@tanstack/react-query';
import { CloudUploadIcon } from 'lucide-react';
import { migrateClientProcurementDocumentsToS3 } from '../api/migrate-client-procurement-to-s3';

export function MigrateClientProcurementS3Dialog({
  client,
}: {
  client: AdminClientSummary;
}) {
  const [open, setOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [migratedCount, setMigratedCount] = useState<number | null>(null);

  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  const notOnS3Count = client.procurementAttachmentsNotOnS3Count ?? 0;
  const s3Ok = client.procurementS3Configured ?? false;
  const canMigrate = notOnS3Count > 0 && s3Ok;

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setError(null);
      setDone(false);
      setMigratedCount(null);
      setIsMigrating(false);
    }
  };

  const handleMigrate = async () => {
    setError(null);
    setIsMigrating(true);
    try {
      const { migratedCount: n } = await migrateClientProcurementDocumentsToS3(
        authenticatedFetch,
        client.id,
      );
      setMigratedCount(n);
      setDone(true);
      await queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'La migration des pièces a échoué.',
      );
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 shrink-0"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Passer les pièces procurement hors S3 vers S3 — ${client.name}`}
      >
        <CloudUploadIcon className="size-3.5" />
        Hors S3 → S3
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton className="sm:max-w-md">
          {!canMigrate ? (
            <>
              <DialogHeader>
                <DialogTitle>Pièces procurement hors S3</DialogTitle>
                <DialogDescription>
                  Cette action ne concerne que les pièces dont le stockage{' '}
                  <strong className="text-foreground">n’est pas encore sur S3</strong>{' '}
                  (fichiers encore référencés en local). Client :{' '}
                  <span className="font-medium text-foreground">{client.name}</span>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                {notOnS3Count === 0 ? (
                  <p>
                    Aucune pièce à traiter : tout le procurement de ce client est
                    déjà référencé en S3, ou il n’y a pas encore de pièces
                    jointes (compteur « hors S3 » : 0).
                  </p>
                ) : (
                  <p>
                    Il reste{' '}
                    <strong className="text-foreground">{notOnS3Count}</strong> pièce
                    {notOnS3Count > 1 ? 's' : ''} hors S3, mais la plateforme ne voit
                    pas une configuration S3 procurement exploitable.
                  </p>
                )}
                {!s3Ok ? (
                  <p>
                    <Link
                      href="/admin/procurement-storage"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Réglages stockage procurement
                    </Link>{' '}
                    — renseigne S3 (ou variables d’environnement), active la
                    config si besoin, puis recharge cette page.
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          ) : done ? (
            <>
              <DialogHeader>
                <DialogTitle>Migration terminée</DialogTitle>
                <DialogDescription>
                  {migratedCount === 0 ? (
                    <>
                      Aucune pièce hors S3 à migrer pour {client.name} (déjà en S3 ou
                      aucune référence locale).
                    </>
                  ) : (
                    <>
                      {migratedCount} pièce{migratedCount !== 1 ? 's' : ''} passée
                      {migratedCount !== 1 ? 's' : ''} en stockage S3. Les
                      téléchargements utiliseront désormais S3.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" onClick={() => setOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Passer le stockage procurement en S3</DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-foreground">{notOnS3Count}</span>{' '}
                  pièce{notOnS3Count > 1 ? 's' : ''} jointe{notOnS3Count > 1 ? 's' : ''}{' '}
                  {notOnS3Count > 1 ? 'ont' : 'a'} encore un stockage{' '}
                  <strong className="text-foreground">hors S3</strong> (disque). Copie
                  vers le bucket S3 du client, mise à jour des références, puis
                  suppression des fichiers locaux après succès.
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isMigrating}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleMigrate()}
                  disabled={isMigrating}
                >
                  {isMigrating ? 'Migration…' : 'Lancer la migration'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
