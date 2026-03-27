'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, ShieldAlert } from 'lucide-react';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';

import { SupplierSearchCombobox } from '@/features/procurement/components/supplier-search-combobox';
import { NewSupplierDialog } from '@/features/procurement/components/suppliers/new-supplier-dialog';
import {
  SupplierContactModal,
  type SupplierContactFormErrors,
  type SupplierContactFormState,
} from '@/features/procurement/components/suppliers/supplier-contact-modal';
import { SupplierContactVisualizationModal } from '@/features/procurement/components/suppliers/supplier-contact-visualization-modal';
import type { SupplierContact } from '@/features/procurement/types/supplier.types';
import {
  createSupplierContact,
  deleteSupplierContactPhoto,
  listAllSupplierContacts,
  uploadSupplierContactPhoto,
  updateSupplierContact,
} from '@/features/procurement/api/procurement.api';
import { SupplierVisualizationModal } from '@/features/procurement/components/suppliers/supplier-visualization-modal';

import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { usePermissions } from '@/hooks/use-permissions';

type ContactFormState = SupplierContactFormState & { isActive: boolean };
type ContactFormErrors = SupplierContactFormErrors & { isActive?: string };

function sanitizePhone(value: string): string {
  const raw = value.replace(/[^\d+]/g, '');
  const digits = raw.replace(/\D/g, '').slice(0, 15);
  if (!digits) return '';
  return `+${digits}`;
}

function sanitizeNoSpaces(value: string, maxLength: number): string {
  return value.replace(/\s/g, '').slice(0, maxLength);
}

function sanitizeTrimmed(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').slice(0, maxLength);
}

function validateContactForm(values: ContactFormState): ContactFormErrors {
  const errors: ContactFormErrors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+[1-9]\d{5,14}$/;

  const hasFirstOrLast = !!values.firstName.trim() || !!values.lastName.trim();
  const effectiveFullName = hasFirstOrLast
    ? `${values.firstName.trim()} ${values.lastName.trim()}`.replace(/\s+/g, ' ').trim()
    : values.fullName.trim();

  if (!effectiveFullName) errors.fullName = 'Le nom complet est obligatoire.';
  if (values.firstName.length > 120) errors.firstName = 'Maximum 120 caractères.';
  if (values.lastName.length > 120) errors.lastName = 'Maximum 120 caractères.';
  if (effectiveFullName.length > 255) errors.fullName = 'Maximum 255 caractères.';
  if (values.role.length > 120) errors.role = 'Maximum 120 caractères.';

  if (values.email && !emailRegex.test(values.email.trim())) errors.email = 'Email invalide.';
  if (values.email.length > 255) errors.email = 'Maximum 255 caractères.';
  if (values.phone && !phoneRegex.test(values.phone.trim())) errors.phone = 'Téléphone invalide.';
  if (values.phone.length > 16) errors.phone = 'Maximum 16 caractères.';
  if (values.mobile && !phoneRegex.test(values.mobile.trim())) errors.mobile = 'Mobile invalide.';
  if (values.mobile.length > 16) errors.mobile = 'Maximum 16 caractères.';
  if (values.notes.length > 2000) errors.notes = 'Maximum 2000 caractères.';

  return errors;
}

export default function SupplierContactsPage() {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } = usePermissions();
  const queryClient = useQueryClient();

  const clientId = activeClient?.id ?? '';
  const canRead = has('procurement.read');
  const canCreate = has('procurement.create');
  const canUpdate = has('procurement.update');

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierValue, setSupplierValue] = useState('');
  const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false);
  const [newSupplierInitialName, setNewSupplierInitialName] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const normalizedContactSearch = useMemo(() => contactSearch.trim(), [contactSearch]);

  const [includeInactive, setIncludeInactive] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [readContactOpen, setReadContactOpen] = useState(false);
  const [readContact, setReadContact] = useState<SupplierContact | null>(null);
  const [readSupplierOpen, setReadSupplierOpen] = useState(false);
  const [readSupplierId, setReadSupplierId] = useState<string | null>(null);
  const [statusEditingContactId, setStatusEditingContactId] = useState<string | null>(null);
  const [statusDraftValue, setStatusDraftValue] = useState<'active' | 'inactive'>('active');
  /** Fournisseur d’origine du contact en édition — utilisé dans l’URL PATCH (ne change pas quand l’utilisateur reprend un autre fournisseur). */
  const [editOriginalSupplierId, setEditOriginalSupplierId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>({
    firstName: '',
    lastName: '',
    fullName: '',
    role: '',
    email: '',
    phone: '',
    mobile: '',
    notes: '',
    isActive: true,
    isPrimary: false,
  });
  const [contactFormErrors, setContactFormErrors] = useState<ContactFormErrors>({});
  const [contactPhotoFile, setContactPhotoFile] = useState<File | null>(null);
  const [contactPhotoRemoved, setContactPhotoRemoved] = useState(false);
  const [contactPhotoUrl, setContactPhotoUrl] = useState<string | null>(null);

  const derivedFullName = useMemo(() => {
    const fn = contactForm.firstName.trim();
    const ln = contactForm.lastName.trim();
    if (fn || ln) return `${fn} ${ln}`.replace(/\s+/g, ' ').trim();
    return contactForm.fullName.trim();
  }, [contactForm.firstName, contactForm.lastName, contactForm.fullName]);

  const { clearDraft: clearContactFormDraft } = useFormAutosave({
    storageKey: clientId ? `procurement:contacts:form:${clientId}` : '',
    enabled: !!clientId && dialogOpen,
    value: {
      contactForm,
      supplierId,
      supplierValue,
    },
    onRestore: (draft) => {
      if (draft.contactForm) setContactForm(draft.contactForm);
      if ('supplierId' in draft) setSupplierId(draft.supplierId ?? null);
      if ('supplierValue' in draft) setSupplierValue(draft.supplierValue ?? '');
    },
  });

  useEffect(() => {
    const fn = contactForm.firstName.trim();
    const ln = contactForm.lastName.trim();
    if (fn || ln) {
      // Alignement strict avec la règle backend : fullName est recalculé depuis firstName/lastName.
      setContactForm((p) => ({ ...p, fullName: `${fn} ${ln}`.replace(/\s+/g, ' ').trim() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactForm.firstName, contactForm.lastName]);

  // Cohérence UX : le "principal" n'a de sens que si un fournisseur est sélectionné.
  useEffect(() => {
    if (!supplierId) {
      setContactForm((p) => ({ ...p, isPrimary: false }));
    }
  }, [supplierId]);

  const supplierContactsQuery = useQuery({
    queryKey: [
      'procurement',
      clientId,
      'supplier-contacts-all',
      'includeInactive',
      includeInactive ? 1 : 0,
      'search',
      normalizedContactSearch,
    ],
    queryFn: () =>
      listAllSupplierContacts(authFetch, {
        includeInactive,
        limit: 200,
        offset: 0,
        search: normalizedContactSearch || undefined,
      }),
    enabled: !!clientId && permsSuccess && canRead && !permsLoading,
  });

  const createContactMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error('Fournisseur requis.');
      const errors = validateContactForm(contactForm);
      setContactFormErrors(errors);
      if (Object.keys(errors).length > 0) throw new Error('Veuillez corriger les champs contact.');

      const created = await createSupplierContact(authFetch, supplierId, {
        firstName: contactForm.firstName || undefined,
        lastName: contactForm.lastName || undefined,
        fullName: derivedFullName || undefined,
        role: contactForm.role || undefined,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
        mobile: contactForm.mobile || undefined,
        notes: contactForm.notes || undefined,
        isPrimary: contactForm.isPrimary,
      });
      if (contactPhotoFile) {
        await uploadSupplierContactPhoto(authFetch, supplierId, created.id, contactPhotoFile);
      }
      return created;
    },
    onSuccess: async (createdContact) => {
      setReadContact((previous) => {
        if (!previous || previous.id !== createdContact.id) return previous;
        return {
          ...previous,
          ...createdContact,
          supplierName: previous.supplierName ?? supplierValue ?? null,
        };
      });
      setDialogOpen(false);
      setEditingContactId(null);
      setEditOriginalSupplierId(null);
      clearContactFormDraft();
      setContactFormErrors({});
      setContactPhotoFile(null);
      setContactPhotoRemoved(false);
      setContactPhotoUrl(null);
      setContactForm({
        firstName: '',
        lastName: '',
        fullName: '',
        role: '',
        email: '',
        phone: '',
        mobile: '',
        notes: '',
        isActive: true,
        isPrimary: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'supplier-contacts-all'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'supplier-contacts'],
      });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId || !editingContactId || !editOriginalSupplierId) {
        throw new Error('Contact requis.');
      }
      const errors = validateContactForm(contactForm);
      setContactFormErrors(errors);
      if (Object.keys(errors).length > 0) throw new Error('Veuillez corriger les champs contact.');

      const updated = await updateSupplierContact(authFetch, editOriginalSupplierId, editingContactId, {
        ...(supplierId !== editOriginalSupplierId ? { supplierId } : {}),
        firstName: contactForm.firstName || null,
        lastName: contactForm.lastName || null,
        fullName: derivedFullName || undefined,
        role: contactForm.role || null,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        mobile: contactForm.mobile || null,
        notes: contactForm.notes || null,
        isActive: contactForm.isActive,
        isPrimary: contactForm.isPrimary,
      });
      if (contactPhotoFile) {
        await uploadSupplierContactPhoto(authFetch, supplierId, editingContactId, contactPhotoFile);
      } else if (contactPhotoRemoved) {
        await deleteSupplierContactPhoto(authFetch, supplierId, editingContactId);
      }
      return updated;
    },
    onSuccess: async (updatedContact) => {
      setReadContact((previous) => {
        if (!previous || previous.id !== updatedContact.id) return previous;
        return {
          ...previous,
          ...updatedContact,
          supplierName: previous.supplierName ?? supplierValue ?? null,
        };
      });
      setDialogOpen(false);
      setEditingContactId(null);
      setEditOriginalSupplierId(null);
      clearContactFormDraft();
      setContactFormErrors({});
      setContactPhotoFile(null);
      setContactPhotoRemoved(false);
      setContactPhotoUrl(null);
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'supplier-contacts-all'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'supplier-contacts'],
      });
    },
  });

  const inlineStatusMutation = useMutation({
    mutationFn: async ({
      contact,
      isActive,
    }: {
      contact: SupplierContact;
      isActive: boolean;
    }) => updateSupplierContact(authFetch, contact.supplierId, contact.id, { isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'supplier-contacts-all'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'supplier-contacts'],
      });
    },
    onSettled: () => {
      setStatusEditingContactId(null);
    },
  });

  const openCreateDialog = () => {
    setEditingContactId(null);
    setEditOriginalSupplierId(null);
    setContactFormErrors({});
    setContactPhotoFile(null);
    setContactPhotoRemoved(false);
    setContactPhotoUrl(null);
    setContactForm({
      firstName: '',
      lastName: '',
      fullName: '',
      role: '',
      email: '',
      phone: '',
      mobile: '',
      notes: '',
      isActive: true,
      isPrimary: false,
    });
    setDialogOpen(true);
  };

  const handleAddContactClick = () => {
    openCreateDialog();
  };

  const openEditDialog = (contact: SupplierContact) => {
    setEditingContactId(contact.id);
    setEditOriginalSupplierId(contact.supplierId);
    setContactFormErrors({});
    setContactPhotoFile(null);
    setContactPhotoRemoved(false);
    setContactPhotoUrl(contact.photoUrl ?? null);
    setSupplierId(contact.supplierId);
    setSupplierValue(contact.supplierName ?? '');
    setContactForm({
      firstName: contact.firstName ?? '',
      lastName: contact.lastName ?? '',
      fullName: contact.fullName ?? '',
      role: contact.role ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      mobile: contact.mobile ?? '',
      notes: contact.notes ?? '',
      isActive: contact.isActive,
      isPrimary: contact.isPrimary,
    });
    setDialogOpen(true);
  };

  const openReadContactDialog = (contact: SupplierContact) => {
    setReadContact(contact);
    setReadContactOpen(true);
  };

  const openReadSupplierDialog = (supplierId: string) => {
    setReadSupplierId(supplierId);
    setReadSupplierOpen(true);
  };

  const mutationError =
    (createContactMutation.error as Error | undefined)?.message ||
    (updateContactMutation.error as Error | undefined)?.message ||
    (inlineStatusMutation.error as Error | undefined)?.message;

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Contacts fournisseurs"
          description="Consultez tous les contacts du client actif ; création et édition se font par fournisseur dans le formulaire."
          actions={
              canCreate ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddContactClick}
                >
                  <Plus className="size-4" />
                  Ajouter un contact
                </Button>
              ) : undefined
          }
        />

        {permsLoading && (
          <Alert>
            <AlertTitle>Chargement des permissions</AlertTitle>
            <AlertDescription>Vérification des droits d&apos;accès au référentiel fournisseurs.</AlertDescription>
          </Alert>
        )}

        {permsError && !permsLoading && (
          <Alert variant="destructive">
            <AlertTitle>Permissions indisponibles</AlertTitle>
            <AlertDescription>Impossible de charger vos permissions pour ce client.</AlertDescription>
          </Alert>
        )}

        {permsSuccess && !canRead && (
          <Alert className="border-amber-500/35 bg-amber-500/5">
            <AlertTriangle />
            <AlertTitle>Accès au module Fournisseurs</AlertTitle>
            <AlertDescription>Votre rôle n&apos;inclut pas la permission <code>procurement.read</code>.</AlertDescription>
          </Alert>
        )}

        {permsSuccess && canRead && (
          <div className="space-y-6">
            <Card size="sm">
              <CardHeader className="border-b border-border/60 pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">Liste des contacts</CardTitle>
                    <CardDescription className="text-xs">
                      Tous les contacts du client actif ; recherche par nom, email, rôle ou fournisseur.
                    </CardDescription>
                  </div>

                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                      />
                      Inclure les contacts inactifs
                    </label>
                    <div className="w-72 max-w-full">
                      <Input
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Rechercher (nom, email, rôle, fournisseur)…"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {supplierContactsQuery.isLoading ? (
                  <LoadingState rows={5} />
                ) : supplierContactsQuery.isError ? (
                  <div className="p-6">
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>Chargement impossible</AlertTitle>
                      <AlertDescription>Impossible de charger les contacts.</AlertDescription>
                    </Alert>
                  </div>
                ) : (supplierContactsQuery.data?.items.length ?? 0) === 0 ? (
                  <div className="p-6">
                    <EmptyState title="Aucun contact" description="Aucun contact ne correspond à votre sélection." />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-md border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fournisseur</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Rôle</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Téléphone</TableHead>
                          <TableHead>Principal</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(supplierContactsQuery.data?.items ?? []).map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-muted-foreground">
                              <button
                                type="button"
                                className="text-left underline-offset-2 hover:underline"
                                onClick={() => openReadSupplierDialog(c.supplierId)}
                              >
                                {c.supplierName ?? '—'}
                              </button>
                            </TableCell>
                            <TableCell className="font-medium">
                              <button
                                type="button"
                                className="inline-flex items-center text-left underline-offset-2 hover:underline"
                                onClick={() => openReadContactDialog(c)}
                              >
                                <span>{c.fullName}</span>
                              </button>
                            </TableCell>
                            <TableCell>{c.role ?? '—'}</TableCell>
                            <TableCell>{c.email ?? '—'}</TableCell>
                            <TableCell>{c.phone ?? c.mobile ?? '—'}</TableCell>
                            <TableCell>{c.isPrimary ? 'Oui' : '—'}</TableCell>
                            <TableCell>
                              {canUpdate && statusEditingContactId === c.id ? (
                                <select
                                  autoFocus
                                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                  value={statusDraftValue}
                                  disabled={inlineStatusMutation.isPending}
                                  onChange={(e) => {
                                    const next = e.target.value as 'active' | 'inactive';
                                    setStatusDraftValue(next);
                                    const nextIsActive = next === 'active';
                                    if (nextIsActive === c.isActive) {
                                      setStatusEditingContactId(null);
                                      return;
                                    }
                                    void inlineStatusMutation.mutateAsync({
                                      contact: c,
                                      isActive: nextIsActive,
                                    });
                                  }}
                                  onBlur={() => {
                                    if (!inlineStatusMutation.isPending) {
                                      setStatusEditingContactId(null);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setStatusEditingContactId(null);
                                    }
                                  }}
                                >
                                  <option value="active">Actif</option>
                                  <option value="inactive">Inactif</option>
                                </select>
                              ) : (
                                <button
                                  type="button"
                                  className="underline-offset-2 hover:underline disabled:no-underline"
                                  disabled={!canUpdate}
                                  onClick={() => {
                                    if (!canUpdate) return;
                                    setStatusEditingContactId(c.id);
                                    setStatusDraftValue(c.isActive ? 'active' : 'inactive');
                                  }}
                                >
                                  {c.isActive ? 'Actif' : 'Inactif'}
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <SupplierContactModal
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setContactFormErrors({});
              setEditingContactId(null);
              setEditOriginalSupplierId(null);
              setContactPhotoFile(null);
              setContactPhotoRemoved(false);
              setContactPhotoUrl(null);
            }
          }}
          isEditing={!!editingContactId}
          photoUrl={contactPhotoUrl}
          onPhotoChange={(file) => {
            if (file) {
              setContactPhotoFile(file);
              setContactPhotoRemoved(false);
              return;
            }
            setContactPhotoFile(null);
            setContactPhotoRemoved(true);
            setContactPhotoUrl(null);
          }}
          form={contactForm}
          errors={contactFormErrors}
          onChange={(key, value) => {
            if (typeof value === 'string') {
              if (key === 'email') {
                setContactForm((prev) => ({ ...prev, email: sanitizeNoSpaces(value, 255) }));
                return;
              }
              if (key === 'phone') {
                setContactForm((prev) => ({ ...prev, phone: sanitizePhone(value) }));
                return;
              }
              if (key === 'mobile') {
                setContactForm((prev) => ({ ...prev, mobile: sanitizePhone(value) }));
                return;
              }
              if (key === 'notes') {
                setContactForm((prev) => ({ ...prev, notes: sanitizeTrimmed(value, 2000) }));
                return;
              }
              if (key === 'fullName') {
                setContactForm((prev) => ({ ...prev, fullName: sanitizeTrimmed(value, 255) }));
                return;
              }
              if (key === 'firstName' || key === 'lastName' || key === 'role') {
                setContactForm((prev) => ({
                  ...prev,
                  [key]: sanitizeTrimmed(value, 120),
                }));
                return;
              }
            }
            setContactForm((prev) => ({ ...prev, [key]: value }));
          }}
          onSubmit={() => {
            if (editingContactId) {
              void updateContactMutation.mutateAsync();
            } else {
              void createContactMutation.mutateAsync();
            }
          }}
          isSubmitting={createContactMutation.isPending || updateContactMutation.isPending}
          isSubmitDisabled={!supplierId}
          disablePrimary={!supplierId}
          supplierSection={
            <div className="space-y-3">
              <div className="pt-2">
                <h4 className="mb-2 text-sm font-semibold text-foreground">Fournisseur</h4>
                <SupplierSearchCombobox
                  id="supplier-contacts-picker-dialog"
                  value={supplierValue}
                  onChange={setSupplierValue}
                  parentOpen={dialogOpen}
                  onSupplierPicked={(s) => {
                    setSupplierId(s.id);
                    setSupplierValue(s.name);
                  }}
                  onManualInput={() => {
                    setSupplierId(null);
                  }}
                  onRequestOpenCreateDialog={
                    canCreate
                      ? (draftName) => {
                          setNewSupplierInitialName(draftName);
                          setNewSupplierModalOpen(true);
                        }
                      : undefined
                  }
                  hasSupplierSelection={!!supplierId}
                />
              </div>
              <label className={`flex items-center gap-2 text-sm ${!supplierId ? 'opacity-60' : ''}`}>
                <input
                  type="checkbox"
                  checked={contactForm.isActive}
                  onChange={(e) => {
                    setContactForm((p) => ({ ...p, isActive: e.target.checked }));
                  }}
                />
                Contact actif
              </label>
              <label className={`flex items-center gap-2 text-sm ${!supplierId ? 'opacity-60' : ''}`}>
                <input
                  type="checkbox"
                  checked={contactForm.isPrimary}
                  disabled={!supplierId}
                  onChange={(e) => {
                    if (!supplierId) return;
                    setContactForm((p) => ({ ...p, isPrimary: e.target.checked }));
                  }}
                />
                Marquer comme contact principal
              </label>
            </div>
          }
        />

        {mutationError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        )}

        <SupplierContactVisualizationModal
          open={readContactOpen}
          onOpenChange={setReadContactOpen}
          contact={readContact}
          onEdit={
            canUpdate
              ? (contact) => {
                  setReadContactOpen(false);
                  openEditDialog(contact);
                }
              : undefined
          }
        />

        <SupplierVisualizationModal
          open={readSupplierOpen}
          onOpenChange={setReadSupplierOpen}
          supplierId={readSupplierId}
          onEdit={(supplierId) => {
            setReadSupplierOpen(false);
            router.push(`/suppliers?editSupplierId=${supplierId}`);
          }}
        />

        <NewSupplierDialog
          open={newSupplierModalOpen}
          onOpenChange={setNewSupplierModalOpen}
          initialName={newSupplierInitialName}
          onCreated={(created) => {
            setSupplierId(created.id);
            setSupplierValue(created.name);
          }}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}

function AlertTriangle() {
  return <ShieldAlert className="size-4" />;
}

