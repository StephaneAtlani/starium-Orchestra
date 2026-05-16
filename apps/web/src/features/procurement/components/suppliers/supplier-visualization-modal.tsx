'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, FileText, Pencil, Phone, Receipt, Users2 } from 'lucide-react';

import { EmptyState } from '@/components/feedback/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSupplierById, listSupplierContacts } from '@/features/procurement/api/procurement.api';
import { SupplierContactVisualizationModal } from '@/features/procurement/components/suppliers/supplier-contact-visualization-modal';
import { usePurchaseOrdersListQuery } from '@/features/procurement/hooks/use-procurement-purchase-orders';
import { useInvoicesListQuery } from '@/features/procurement/hooks/use-procurement-invoices';
import type { SupplierContact } from '@/features/procurement/types/supplier.types';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { formatNumberFr } from '@/lib/currency-format';
import { usePermissions } from '@/hooks/use-permissions';
import { SupplierContractsPreviewCard } from '@/features/contracts/components/supplier-contracts-preview-card';
import { ResourceAclTriggerButton } from '@/features/resource-acl/components/resource-acl-trigger-button';
import { AccessExplainerPopover } from '@/features/access-diagnostics/components/access-explainer-popover';
import { OwnerOrgUnitNullWarning } from '@/features/organization/components/owner-org-unit-null-warning';
import type { OwnerOrgUnitSummary } from '@/features/organization/types/owner-org-unit-summary';

const PROCUREMENT_PREVIEW_LIMIT = 8;

function formatOwnerOrgSummary(summary: OwnerOrgUnitSummary | null | undefined): string {
  if (!summary) return '—';
  return summary.code ? `${summary.name} (${summary.code})` : summary.name;
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

export function SupplierVisualizationContent({
  supplierId,
  onEditSupplier,
  onEditContact,
}: {
  supplierId: string;
  onEditSupplier?: (supplierId: string) => void;
  onEditContact?: (contact: SupplierContact) => void;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { has, isSuccess: permsSuccess, isLoading: permsLoading } = usePermissions();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [readContactOpen, setReadContactOpen] = useState(false);
  const [readContact, setReadContact] = useState<SupplierContact | null>(null);

  const clientId = activeClient?.id ?? '';
  const canRead = has('procurement.read');

  const supplierQuery = useQuery({
    queryKey: ['procurement', clientId, 'supplier', supplierId, 'visualization'],
    queryFn: () => getSupplierById(authFetch, supplierId),
    enabled: !!supplierId && !!clientId && permsSuccess && canRead && !permsLoading,
  });

  const contactsQuery = useQuery({
    queryKey: ['procurement', clientId, 'supplier-contacts', supplierId, 'visualization'],
    queryFn: () =>
      listSupplierContacts(authFetch, supplierId, {
        includeInactive: true,
        limit: 200,
        offset: 0,
      }),
    enabled: !!supplierId && !!clientId && permsSuccess && canRead && !permsLoading,
  });

  const procurementListsEnabled =
    Boolean(supplierId && clientId && permsSuccess && canRead && !permsLoading);

  const purchaseOrdersPreview = usePurchaseOrdersListQuery({
    offset: 0,
    limit: PROCUREMENT_PREVIEW_LIMIT,
    supplierId,
    includeCancelled: false,
    enabled: procurementListsEnabled,
  });

  const invoicesPreview = useInvoicesListQuery({
    offset: 0,
    limit: PROCUREMENT_PREVIEW_LIMIT,
    supplierId,
    includeCancelled: false,
    enabled: procurementListsEnabled,
  });

  const contacts = useMemo(
    () => contactsQuery.data?.items ?? [],
    [contactsQuery.data?.items],
  );
  const activeContacts = useMemo(() => contacts.filter((c) => c.isActive), [contacts]);
  const primaryContact = useMemo(
    () => activeContacts.find((c) => c.isPrimary) ?? activeContacts[0] ?? null,
    [activeContacts],
  );
  const supportContact = useMemo(
    () =>
      activeContacts.find((c) => (c.role ?? '').toLowerCase().includes('support')) ??
      primaryContact,
    [activeContacts, primaryContact],
  );
  const commercialContact = useMemo(
    () =>
      activeContacts.find((c) => (c.role ?? '').toLowerCase().includes('commercial')) ?? null,
    [activeContacts],
  );
  const showCommercialContact =
    !!commercialContact &&
    commercialContact.id !== primaryContact?.id &&
    commercialContact.id !== supportContact?.id;

  const openReadContact = (contact: SupplierContact | null) => {
    if (!contact) return;
    setReadContact({
      ...contact,
      supplierName: supplierQuery.data?.name ?? contact.supplierName ?? null,
    });
    setReadContactOpen(true);
  };

  useEffect(() => {
    if (!readContact?.id) return;
    const fresh = contacts.find((item) => item.id === readContact.id);
    if (!fresh) return;
    setReadContact({
      ...fresh,
      supplierName: supplierQuery.data?.name ?? fresh.supplierName ?? null,
    });
  }, [contacts, readContact?.id, supplierQuery.data?.name]);

  useEffect(() => {
    let canceled = false;
    if (!supplierId) {
      setLogoUrl(null);
      return;
    }

    (async () => {
      try {
        const res = await authFetch(`/api/suppliers/${supplierId}/logo`);
        if (!res.ok || canceled) {
          if (!canceled) setLogoUrl(null);
          return;
        }
        const blob = await res.blob();
        if (canceled) return;
        const nextUrl = URL.createObjectURL(blob);
        setLogoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
      } catch {
        if (!canceled) setLogoUrl(null);
      }
    })();

    return () => {
      canceled = true;
      setLogoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [authFetch, supplierId]);

  if (!canRead && permsSuccess) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Acces refuse</AlertTitle>
        <AlertDescription>Permission `procurement.read` requise.</AlertDescription>
      </Alert>
    );
  }

  if (supplierQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Fournisseur introuvable</AlertTitle>
        <AlertDescription>Impossible de charger ce fournisseur.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <ResourceAclTriggerButton
          resourceType="SUPPLIER"
          resourceId={supplierId}
          resourceLabel={supplierQuery.data?.name ?? 'Fournisseur'}
          size="sm"
        />
        <AccessExplainerPopover
          resourceType="SUPPLIER"
          resourceId={supplierId}
          resourceLabel={supplierQuery.data?.name ?? 'Fournisseur'}
          intent="READ"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-20 max-w-[10rem] shrink-0 items-center justify-start overflow-hidden">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Logo fournisseur"
                    width={160}
                    height={80}
                    unoptimized
                    className="h-full w-auto object-contain"
                  />
                ) : (
                  <Building2 className="size-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Coordonnees fournisseur
                </CardTitle>
                <CardDescription>Bloc de reference en lecture seule.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nom</p>
              <p className="font-medium">{supplierQuery.data?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Code</p>
              <p>{supplierQuery.data?.code ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p>{supplierQuery.data?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telephone</p>
              <p>{supplierQuery.data?.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Site web</p>
              <p>{supplierQuery.data?.website ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Statut</p>
              <Badge variant="secondary">{supplierQuery.data?.status ?? 'UNKNOWN'}</Badge>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Direction propriétaire</p>
              <p className="font-medium">
                {formatOwnerOrgSummary(supplierQuery.data?.ownerOrgUnitSummary)}
              </p>
              {!supplierQuery.data?.ownerOrgUnitSummary ? (
                <OwnerOrgUnitNullWarning className="mt-2" />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Phone className="size-4" />
              Contact
            </CardTitle>
            <CardDescription>Comment joindre ce fournisseur rapidement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background p-3">
                <p className="text-xs text-muted-foreground">Contact principal</p>
                <button
                  type="button"
                  className="font-semibold underline-offset-2 hover:underline"
                  onClick={() => openReadContact(primaryContact)}
                  disabled={!primaryContact}
                >
                  {primaryContact?.fullName ?? '—'}
                </button>
                <p className="text-xs text-muted-foreground">{primaryContact?.role ?? '—'}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Téléphone: {primaryContact?.phone ?? primaryContact?.mobile ?? '—'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Email: {primaryContact?.email ?? '—'}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background p-3">
                <p className="text-xs text-muted-foreground">Contact support</p>
                <button
                  type="button"
                  className="font-semibold underline-offset-2 hover:underline"
                  onClick={() => openReadContact(supportContact)}
                  disabled={!supportContact}
                >
                  {supportContact?.fullName ?? '—'}
                </button>
                <p className="text-xs text-muted-foreground">{supportContact?.role ?? '—'}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Téléphone: {supportContact?.phone ?? supportContact?.mobile ?? '—'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Email: {supportContact?.email ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            {showCommercialContact ? (
              <div className="rounded-lg border border-border/70 bg-background p-3">
                <p className="text-xs text-muted-foreground">Contact commercial</p>
                <button
                  type="button"
                  className="font-semibold underline-offset-2 hover:underline"
                  onClick={() => openReadContact(commercialContact)}
                  disabled={!commercialContact}
                >
                  {commercialContact?.fullName ?? '—'}
                </button>
                <p className="text-xs text-muted-foreground">{commercialContact?.role ?? '—'}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Téléphone: {commercialContact?.phone ?? commercialContact?.mobile ?? '—'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Email: {commercialContact?.email ?? '—'}
                  </p>
                </div>
              </div>
            ) : null}

          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              Commandes
            </CardTitle>
            <CardDescription>
              Bons de commande associés à ce fournisseur (hors annulées dans cet aperçu).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(permsLoading || (procurementListsEnabled && purchaseOrdersPreview.isLoading)) && (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}
            {procurementListsEnabled && purchaseOrdersPreview.isError && (
              <p className="text-sm text-destructive">Impossible de charger les commandes.</p>
            )}
            {procurementListsEnabled &&
              purchaseOrdersPreview.isSuccess &&
              (purchaseOrdersPreview.data?.items.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Aucune commande pour ce fournisseur.</p>
              )}
            {procurementListsEnabled &&
              purchaseOrdersPreview.isSuccess &&
              (purchaseOrdersPreview.data?.items.length ?? 0) > 0 && (
                <div className="overflow-hidden rounded-md border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead className="text-right">HT</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(purchaseOrdersPreview.data?.items ?? []).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs">
                            <Link
                              href={`/suppliers/purchase-orders/${row.id}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {row.reference}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate text-sm">{row.label}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {formatNumberFr(row.amountHt, { minFraction: 2, maxFraction: 2 })} €
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatShortDate(row.orderDate)}
                          </TableCell>
                          <TableCell>
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{row.status}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            {procurementListsEnabled &&
              purchaseOrdersPreview.isSuccess &&
              (purchaseOrdersPreview.data?.total ?? 0) > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                <Link
                  href={`/suppliers/purchase-orders?supplierId=${encodeURIComponent(supplierId)}`}
                  className="text-primary font-medium underline-offset-2 hover:underline"
                >
                  Voir toutes les commandes
                  {(purchaseOrdersPreview.data?.total ?? 0) > PROCUREMENT_PREVIEW_LIMIT
                    ? ` (${purchaseOrdersPreview.data?.total})`
                    : ''}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4" />
              Factures
            </CardTitle>
            <CardDescription>
              Factures enregistrées pour ce fournisseur (hors annulées dans cet aperçu).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(permsLoading || (procurementListsEnabled && invoicesPreview.isLoading)) && (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}
            {procurementListsEnabled && invoicesPreview.isError && (
              <p className="text-sm text-destructive">Impossible de charger les factures.</p>
            )}
            {procurementListsEnabled &&
              invoicesPreview.isSuccess &&
              (invoicesPreview.data?.items.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">Aucune facture pour ce fournisseur.</p>
            )}
            {procurementListsEnabled &&
              invoicesPreview.isSuccess &&
              (invoicesPreview.data?.items.length ?? 0) > 0 && (
              <div className="overflow-hidden rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right">HT</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoicesPreview.data?.items ?? []).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">
                          <Link
                            href={`/suppliers/invoices/${row.id}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {row.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">{row.label}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatNumberFr(row.amountHt, { minFraction: 2, maxFraction: 2 })} €
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatShortDate(row.invoiceDate)}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{row.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {procurementListsEnabled &&
              invoicesPreview.isSuccess &&
              (invoicesPreview.data?.total ?? 0) > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                <Link
                  href={`/suppliers/invoices?supplierId=${encodeURIComponent(supplierId)}`}
                  className="text-primary font-medium underline-offset-2 hover:underline"
                >
                  Voir toutes les factures
                  {(invoicesPreview.data?.total ?? 0) > PROCUREMENT_PREVIEW_LIMIT
                    ? ` (${invoicesPreview.data?.total})`
                    : ''}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <SupplierContractsPreviewCard supplierId={supplierId} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="size-4" />
            Contacts
          </CardTitle>
          <CardDescription>Contacts operationnels et support.</CardDescription>
        </CardHeader>
        <CardContent>
          {contactsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des contacts…</p>
          ) : contacts.length === 0 ? (
            <EmptyState title="Aucun contact" description="Aucun contact trouve pour ce fournisseur." />
          ) : (
            <div className="overflow-hidden rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telephone</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline"
                          onClick={() => openReadContact(c)}
                        >
                          {c.fullName}
                        </button>
                      </TableCell>
                      <TableCell>{c.role ?? '—'}</TableCell>
                      <TableCell>{c.email ?? '—'}</TableCell>
                      <TableCell>{c.phone ?? c.mobile ?? '—'}</TableCell>
                      <TableCell>{c.isActive ? 'Actif' : 'Inactif'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierContactVisualizationModal
        open={readContactOpen}
        onOpenChange={setReadContactOpen}
        contact={readContact}
        onEdit={
          onEditContact
            ? (contact) => {
                onEditContact(contact);
              }
            : undefined
        }
      />
    </div>
  );
}

export function SupplierVisualizationModal({
  open,
  onOpenChange,
  supplierId,
  onEdit,
  onEditContact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string | null;
  onEdit?: (supplierId: string) => void;
  onEditContact?: (contact: SupplierContact) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!h-screen !max-h-screen !w-screen !max-w-screen overflow-y-auto rounded-none p-6">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>Fiche fournisseur</DialogTitle>
              <DialogDescription>Consultation en lecture seule.</DialogDescription>
            </div>
            {onEdit && supplierId ? (
              <button
                type="button"
                className="mr-2 inline-flex h-8 items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted/60"
                onClick={() => onEdit(supplierId)}
              >
                <Pencil className="size-4" />
                Modifier
              </button>
            ) : null}
          </div>
        </DialogHeader>
        {supplierId ? (
          <SupplierVisualizationContent
            supplierId={supplierId}
            onEditSupplier={onEdit}
            onEditContact={onEditContact}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Aucun fournisseur selectionne.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
