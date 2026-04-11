'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SupplierContact } from '@/features/procurement/types/supplier.types';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { Pencil } from 'lucide-react';

type SupplierContactVisualizationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: SupplierContact | null;
  onEdit?: (contact: SupplierContact) => void;
};

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function SupplierContactVisualizationModal({
  open,
  onOpenChange,
  contact,
  onEdit,
}: SupplierContactVisualizationModalProps) {
  const authFetch = useAuthenticatedFetch();
  const [resolvedPhotoSrc, setResolvedPhotoSrc] = useState<string | null>(null);
  const resolvedPhotoUrl =
    (contact as unknown as { photoUrl?: string | null; avatarUrl?: string | null; photo?: { url?: string | null } | null })
      ?.photoUrl ??
    (contact as unknown as { photoUrl?: string | null; avatarUrl?: string | null; photo?: { url?: string | null } | null })
      ?.avatarUrl ??
    (contact as unknown as { photoUrl?: string | null; avatarUrl?: string | null; photo?: { url?: string | null } | null })
      ?.photo?.url ??
    null;

  useEffect(() => {
    let revokedUrl: string | null = null;
    let isCancelled = false;

    async function loadPhoto() {
      if (!open || !resolvedPhotoUrl) {
        setResolvedPhotoSrc(null);
        return;
      }
      try {
        const response = await authFetch(resolvedPhotoUrl);
        if (!response.ok) {
          setResolvedPhotoSrc(null);
          return;
        }
        const blob = await response.blob();
        if (isCancelled) return;
        revokedUrl = URL.createObjectURL(blob);
        setResolvedPhotoSrc(revokedUrl);
      } catch {
        if (!isCancelled) {
          setResolvedPhotoSrc(null);
        }
      }
    }

    void loadPhoto();

    return () => {
      isCancelled = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [authFetch, open, resolvedPhotoUrl]);

  const fullName = contact?.fullName ?? '—';
  const initials = contact?.fullName ? getInitials(contact.fullName) : '—';
  const firstName = contact?.firstName ?? '—';
  const lastName = contact?.lastName ?? '—';
  const role = contact?.role ?? '—';
  const supplierName = contact?.supplierName ?? '—';
  const email = contact?.email ?? '—';
  const phone = contact?.phone ?? '—';
  const mobile = contact?.mobile ?? '—';
  const notes = contact?.notes ?? '—';
  const statusLabel = contact?.isActive ? 'Actif' : 'Inactif';
  const createdAt = contact?.createdAt
    ? new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(contact.createdAt))
    : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[110] bg-black/40 duration-200 dark:bg-black/55 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
      ) : null}
      <DialogContent
        className="!z-[120] !max-h-[90vh] !w-[90vw] !max-w-[90vw] sm:!max-w-[90vw] overflow-y-auto p-6"
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-3 pr-14">
          <div>
          <DialogTitle>Fiche contact fournisseur</DialogTitle>
          <DialogDescription>Consultation en lecture seule.</DialogDescription>
          </div>
          {onEdit && contact ? (
            <button
              type="button"
              className="mr-6 inline-flex h-8 items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted/60"
              onClick={() => onEdit(contact)}
            >
              <Pencil className="size-4" />
              Modifier le contact
            </button>
          ) : null}
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Identité</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {resolvedPhotoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- simple readonly avatar rendering
                    <img
                      src={resolvedPhotoSrc}
                      alt={`Photo de ${fullName}`}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-base font-semibold">
                      {initials}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{fullName}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={contact?.isActive ? 'default' : 'secondary'}>{statusLabel}</Badge>
                      {contact?.isPrimary ? <Badge variant="outline">Principal</Badge> : null}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Prénom</p>
                    <p>{firstName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nom</p>
                    <p>{lastName}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Rôle</p>
                    <p>{role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coordonnées</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p>{email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <p>{phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mobile</p>
                  <p>{mobile}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fournisseur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nom du fournisseur</p>
                  <p className="font-medium">{supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Créé le</p>
                  <p>{createdAt}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{notes}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
