'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, Search } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import {
  createSupplierCategory,
  createSupplierContact,
  createSupplier,
  deactivateSupplierContact,
  deleteSupplierLogo,
  listSupplierContacts,
  listSupplierCategories,
  listSuppliers,
  uploadSupplierLogo,
  updateSupplierContact,
  updateSupplier,
  updateSupplierCategory,
} from '@/features/procurement/api/procurement.api';
import { ImageUploadDropzone } from '@/features/procurement/components/image-upload-dropzone';
import { SupplierVisualizationModal } from '@/features/procurement/components/suppliers/supplier-visualization-modal';
import { SupplierContactModal } from '@/features/procurement/components/suppliers/supplier-contact-modal';

type SupplierFormState = {
  name: string;
  code: string;
  siret: string;
  vatNumber: string;
  externalId: string;
  email: string;
  phone: string;
  website: string;
  notes: string;
  supplierCategoryId: string;
};

type SupplierFormErrors = Partial<Record<keyof SupplierFormState, string>>;

type SupplierContactFormState = {
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
  isPrimary: boolean;
};

type SupplierContactFormErrors = Partial<Record<keyof SupplierContactFormState, string>>;

function sanitizeDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function sanitizeVat(value: string): string {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18);
  // FR VAT display format: FR XX XXX XXX XXX
  if (normalized.startsWith('FR')) {
    const key = normalized.slice(2, 4);
    const siren = normalized.slice(4, 13);
    const groups = siren.match(/.{1,3}/g) ?? [];
    return ['FR', key, ...groups].filter(Boolean).join(' ').trim();
  }
  return normalized;
}

function sanitizePhone(value: string): string {
  return value.replace(/[^+0-9()\-\s.]/g, '').slice(0, 20);
}

function sanitizeNoSpaces(value: string, maxLength: number): string {
  return value.replace(/\s/g, '').slice(0, maxLength);
}

function sanitizeTrimmed(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

function normalizeVatForValidation(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
}

function isVatNumberValid(value: string): boolean {
  const vat = normalizeVatForValidation(value);
  if (!vat) return true;

  // France: FR + 2 alphanumeriques + 9 chiffres (SIREN)
  if (vat.startsWith('FR')) {
    return /^FR[A-Z0-9]{2}\d{9}$/.test(vat);
  }

  // Fallback UE (minimum contract): CC + alphanumerique 2..12
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(vat);
}

function validateSupplierContactForm(values: SupplierContactFormState): SupplierContactFormErrors {
  const errors: SupplierContactFormErrors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[+0-9()\-\s.]{6,20}$/;

  if (!values.firstName.trim() && !values.lastName.trim() && !values.fullName.trim()) {
    errors.fullName = 'Le nom complet est obligatoire.';
  }
  if (values.firstName.length > 120) errors.firstName = 'Maximum 120 caractères.';
  if (values.lastName.length > 120) errors.lastName = 'Maximum 120 caractères.';
  if (values.fullName.length > 255) errors.fullName = 'Maximum 255 caractères.';
  if (values.role.length > 120) errors.role = 'Maximum 120 caractères.';
  if (values.email && !emailRegex.test(values.email.trim())) errors.email = 'Email invalide.';
  if (values.email.length > 255) errors.email = 'Maximum 255 caractères.';
  if (values.phone && !phoneRegex.test(values.phone.trim())) errors.phone = 'Téléphone invalide.';
  if (values.phone.length > 64) errors.phone = 'Maximum 64 caractères.';
  if (values.mobile && !phoneRegex.test(values.mobile.trim())) errors.mobile = 'Mobile invalide.';
  if (values.mobile.length > 64) errors.mobile = 'Maximum 64 caractères.';
  if (values.notes.length > 2000) errors.notes = 'Maximum 2000 caractères.';

  return errors;
}

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const [search, setSearch] = useState('');
  const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    siret: '',
    vatNumber: '',
    externalId: '',
    email: '',
    phone: '',
    website: '',
    notes: '',
    supplierCategoryId: '__none__',
  });
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryTarget, setNewCategoryTarget] = useState<'create' | 'edit'>('create');
  const [editSupplierModalOpen, setEditSupplierModalOpen] = useState(false);
  const [readSupplierModalOpen, setReadSupplierModalOpen] = useState(false);
  const [readSupplierId, setReadSupplierId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    siret: '',
    vatNumber: '',
    externalId: '',
    email: '',
    phone: '',
    website: '',
    notes: '',
    supplierCategoryId: '__none__',
  });
  const [formErrors, setFormErrors] = useState<SupplierFormErrors>({});
  const [editFormErrors, setEditFormErrors] = useState<SupplierFormErrors>({});
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<SupplierContactFormState>({
    firstName: '',
    lastName: '',
    fullName: '',
    role: '',
    email: '',
    phone: '',
    mobile: '',
    notes: '',
    isPrimary: false,
  });
  const [contactFormErrors, setContactFormErrors] = useState<SupplierContactFormErrors>({});
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const canReadSuppliers = has('procurement.read');
  const canCreateSuppliers = has('procurement.create');
  const canUpdateSuppliers = has('procurement.update');
  const clientId = activeClient?.id ?? '';
  const normalizedSearch = useMemo(() => search.trim(), [search]);
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['procurement', clientId, 'supplier-categories'],
    queryFn: () =>
      listSupplierCategories(authFetch, {
        includeInactive: false,
        limit: 200,
        offset: 0,
      }),
    enabled: !!clientId && permsSuccess && canReadSuppliers,
  });

  const suppliersQuery = useQuery({
    queryKey: [
      'procurement',
      clientId,
      'suppliers-page',
      normalizedSearch,
      supplierCategoryFilter,
    ],
    queryFn: () =>
      listSuppliers(authFetch, {
        search: normalizedSearch || undefined,
        supplierCategoryId:
          supplierCategoryFilter === 'all' ? undefined : supplierCategoryFilter,
        limit: 50,
        offset: 0,
      }),
    enabled: !!clientId && permsSuccess && canReadSuppliers,
  });

  const supplierContactsQuery = useQuery({
    queryKey: ['procurement', clientId, 'supplier-contacts', selectedSupplierId],
    queryFn: () =>
      listSupplierContacts(authFetch, selectedSupplierId!, {
        includeInactive: true,
        limit: 100,
        offset: 0,
      }),
    enabled:
      !!clientId && !!selectedSupplierId && editSupplierModalOpen && permsSuccess && canReadSuppliers,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (input: { supplierId: string; supplierCategoryId: string | null }) =>
      updateSupplierCategory(authFetch, input.supplierId, input.supplierCategoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'suppliers-page'],
      });
    },
  });

  const validateSupplierForm = (values: SupplierFormState): SupplierFormErrors => {
    const errors: SupplierFormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const websiteRegex = /^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i;
    const phoneRegex = /^[+0-9()\-\s.]{6,20}$/;
    const siretRegex = /^\d{14}$/;

    if (!values.name.trim()) errors.name = 'Le nom est obligatoire.';
    if (values.name.length > 255) errors.name = 'Maximum 255 caractères.';
    if (values.code.length > 64) errors.code = 'Maximum 64 caractères.';
    if (values.externalId.length > 128) errors.externalId = 'Maximum 128 caractères.';
    if (values.email && !emailRegex.test(values.email.trim())) {
      errors.email = 'Email invalide.';
    }
    if (values.email.length > 255) errors.email = 'Maximum 255 caractères.';
    if (values.phone && !phoneRegex.test(values.phone.trim())) {
      errors.phone = 'Téléphone invalide.';
    }
    if (values.phone.length > 64) errors.phone = 'Maximum 64 caractères.';
    if (values.website && !websiteRegex.test(values.website.trim())) {
      errors.website = 'URL invalide.';
    }
    if (values.website.length > 512) errors.website = 'Maximum 512 caractères.';
    if (values.vatNumber && !isVatNumberValid(values.vatNumber)) {
      errors.vatNumber = 'Numéro TVA invalide (ex: FR 12 123 456 789).';
    }
    if (values.vatNumber.length > 64) errors.vatNumber = 'Maximum 64 caractères.';
    if (values.siret && !siretRegex.test(values.siret.trim())) {
      errors.siret = 'SIRET invalide (14 chiffres).';
    }
    if (values.siret.length > 32) errors.siret = 'Maximum 32 caractères.';
    if (values.notes.length > 2000) errors.notes = 'Maximum 2000 caractères.';

    return errors;
  };

  const createSupplierMutation = useMutation({
    mutationFn: async () => {
      const errors = validateSupplierForm(form);
      setFormErrors(errors);
      if (Object.keys(errors).length > 0) {
        throw new Error('Veuillez corriger les champs invalides.');
      }
      const created = await createSupplier(authFetch, {
        name: form.name.trim(),
        code: form.code || undefined,
        siret: form.siret || undefined,
        vatNumber: form.vatNumber || undefined,
        externalId: form.externalId || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        notes: form.notes || undefined,
      });

      if (newLogoFile) {
        await uploadSupplierLogo(authFetch, created.id, newLogoFile);
      }

      if (form.supplierCategoryId !== '__none__') {
        await updateSupplierCategory(authFetch, created.id, form.supplierCategoryId);
      }
      return created;
    },
    onSuccess: async () => {
      setNewSupplierModalOpen(false);
      setFormErrors({});
      setForm({
        name: '',
        code: '',
        siret: '',
        vatNumber: '',
        externalId: '',
        email: '',
        phone: '',
        website: '',
        notes: '',
        supplierCategoryId: '__none__',
      });
      setNewLogoFile(null);
      setNewLogoPreview(null);
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'suppliers-page'],
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createSupplierCategory(authFetch, { name }),
    onSuccess: async (createdCategory) => {
      setNewCategoryName('');
      setNewCategoryModalOpen(false);
      if (newCategoryTarget === 'edit') {
        setEditForm((prev) => ({ ...prev, supplierCategoryId: createdCategory.id }));
      } else {
        setForm((prev) => ({ ...prev, supplierCategoryId: createdCategory.id }));
      }
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'supplier-categories'],
      });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplierId) return null;
      const errors = validateSupplierForm(editForm);
      setEditFormErrors(errors);
      if (Object.keys(errors).length > 0) {
        throw new Error('Veuillez corriger les champs invalides.');
      }
      return updateSupplier(authFetch, selectedSupplierId, {
        name: editForm.name || undefined,
        code: editForm.code || undefined,
        siret: editForm.siret || undefined,
        vatNumber: editForm.vatNumber || undefined,
        externalId: editForm.externalId || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        website: editForm.website || undefined,
        notes: editForm.notes || undefined,
        supplierCategoryId:
          editForm.supplierCategoryId === '__none__'
            ? null
            : editForm.supplierCategoryId,
      });
    },
    onSuccess: async () => {
      if (selectedSupplierId && editLogoFile) {
        await uploadSupplierLogo(authFetch, selectedSupplierId, editLogoFile);
      }
      setEditSupplierModalOpen(false);
      setEditFormErrors({});
      setEditLogoFile(null);
      setEditLogoPreview(null);
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'suppliers-page'],
      });
    },
  });

  const createSupplierContactMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplierId) throw new Error('Fournisseur introuvable.');
      const errors = validateSupplierContactForm(contactForm);
      setContactFormErrors(errors);
      if (Object.keys(errors).length > 0) {
        throw new Error('Veuillez corriger les champs contact invalides.');
      }
      return createSupplierContact(authFetch, selectedSupplierId, {
        firstName: contactForm.firstName || undefined,
        lastName: contactForm.lastName || undefined,
        fullName: contactForm.fullName || undefined,
        role: contactForm.role || undefined,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
        mobile: contactForm.mobile || undefined,
        notes: contactForm.notes || undefined,
        isPrimary: contactForm.isPrimary,
      });
    },
    onSuccess: async () => {
      setContactModalOpen(false);
      setContactFormErrors({});
      setContactForm({
        firstName: '',
        lastName: '',
        fullName: '',
        role: '',
        email: '',
        phone: '',
        mobile: '',
        notes: '',
        isPrimary: false,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['procurement', clientId, 'supplier-contacts', selectedSupplierId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['procurement', clientId, 'suppliers-page'],
        }),
      ]);
    },
  });

  const updateSupplierContactMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplierId || !editingContactId) {
        throw new Error('Contact introuvable.');
      }
      const errors = validateSupplierContactForm(contactForm);
      setContactFormErrors(errors);
      if (Object.keys(errors).length > 0) {
        throw new Error('Veuillez corriger les champs contact invalides.');
      }
      return updateSupplierContact(authFetch, selectedSupplierId, editingContactId, {
        firstName: contactForm.firstName || null,
        lastName: contactForm.lastName || null,
        fullName: contactForm.fullName || undefined,
        role: contactForm.role || null,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        mobile: contactForm.mobile || null,
        notes: contactForm.notes || null,
        isPrimary: contactForm.isPrimary,
      });
    },
    onSuccess: async () => {
      setContactModalOpen(false);
      setEditingContactId(null);
      setContactFormErrors({});
      setContactForm({
        firstName: '',
        lastName: '',
        fullName: '',
        role: '',
        email: '',
        phone: '',
        mobile: '',
        notes: '',
        isPrimary: false,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['procurement', clientId, 'supplier-contacts', selectedSupplierId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['procurement', clientId, 'suppliers-page'],
        }),
      ]);
    },
  });

  const deactivateSupplierContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      if (!selectedSupplierId) throw new Error('Fournisseur introuvable.');
      return deactivateSupplierContact(authFetch, selectedSupplierId, contactId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['procurement', clientId, 'supplier-contacts', selectedSupplierId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['procurement', clientId, 'suppliers-page'],
        }),
      ]);
    },
  });

  useEffect(() => {
    if (!newLogoFile) {
      setNewLogoPreview(null);
      return;
    }
    const nextUrl = URL.createObjectURL(newLogoFile);
    setNewLogoPreview(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [newLogoFile]);

  useEffect(() => {
    let canceled = false;
    if (!selectedSupplierId || !editSupplierModalOpen) {
      setEditLogoPreview(null);
      return;
    }
    if (editLogoFile) {
      const nextUrl = URL.createObjectURL(editLogoFile);
      setEditLogoPreview(nextUrl);
      return () => URL.revokeObjectURL(nextUrl);
    }

    (async () => {
      try {
        const res = await authFetch(`/api/suppliers/${selectedSupplierId}/logo`);
        if (!res.ok || canceled) {
          if (!canceled) setEditLogoPreview(null);
          return;
        }
        const blob = await res.blob();
        if (canceled) return;
        const url = URL.createObjectURL(blob);
        setEditLogoPreview((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return url;
        });
      } catch {
        if (!canceled) setEditLogoPreview(null);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [authFetch, selectedSupplierId, editSupplierModalOpen, editLogoFile]);

  const openEditSupplierModal = (supplier: {
    id: string;
    name: string | null;
    code: string | null;
    siret: string | null;
    vatNumber: string | null;
    externalId: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    notes: string | null;
    supplierCategoryId: string | null;
  }) => {
    setSelectedSupplierId(supplier.id);
    setEditForm({
      name: supplier.name ?? '',
      code: supplier.code ?? '',
      siret: supplier.siret ?? '',
      vatNumber: supplier.vatNumber ?? '',
      externalId: supplier.externalId ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      website: supplier.website ?? '',
      notes: supplier.notes ?? '',
      supplierCategoryId: supplier.supplierCategoryId ?? '__none__',
    });
    setEditLogoFile(null);
    setEditingContactId(null);
    setContactFormErrors({});
    setContactForm({
      firstName: '',
      lastName: '',
      fullName: '',
      role: '',
      email: '',
      phone: '',
      mobile: '',
      notes: '',
      isPrimary: false,
    });
    setEditSupplierModalOpen(true);
  };

  const openCreateContactModal = () => {
    setEditingContactId(null);
    setContactFormErrors({});
    setContactForm({
      firstName: '',
      lastName: '',
      fullName: '',
      role: '',
      email: '',
      phone: '',
      mobile: '',
      notes: '',
      isPrimary: false,
    });
    setContactModalOpen(true);
  };

  useEffect(() => {
    const editSupplierId = searchParams.get('editSupplierId');
    if (!editSupplierId) return;
    const supplier = suppliersQuery.data?.items.find((item) => item.id === editSupplierId);
    if (!supplier) return;
    openEditSupplierModal(supplier);
    window.history.replaceState({}, '', '/suppliers');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, suppliersQuery.data]);

  const openEditFromReadModal = (supplierId: string) => {
    const supplier = suppliersQuery.data?.items.find((item) => item.id === supplierId);
    if (!supplier) return;
    openEditSupplierModal(supplier);
  };

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Fournisseurs"
          description="Référentiel fournisseurs du client actif."
          actions={
            canCreateSuppliers ? (
              <Button type="button" size="sm" onClick={() => setNewSupplierModalOpen(true)}>
                <Plus className="size-4" />
                Ajouter
              </Button>
            ) : undefined
          }
        />

        <Dialog
          open={newSupplierModalOpen}
          onOpenChange={(open) => {
            setNewSupplierModalOpen(open);
            if (!open) {
              setNewLogoFile(null);
              setNewLogoPreview(null);
            }
          }}
        >
          <DialogContent
            className="flex max-h-[90vh] !w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] flex-col gap-4 overflow-y-auto p-6"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Nouveau fournisseur
              </DialogTitle>
              <DialogDescription>
                Crée un fournisseur complet dans le client actif.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Identité</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="supplier-name">Nom</Label>
                    <Input
                      id="supplier-name"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Microsoft"
                    />
                    {formErrors.name ? (
                      <p className="text-xs text-destructive">{formErrors.name}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-code">Code</Label>
                    <Input
                      id="supplier-code"
                      value={form.code}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          code: sanitizeTrimmed(e.target.value, 64),
                        }))
                      }
                      placeholder="Ex: MSFT"
                    />
                    {formErrors.code ? (
                      <p className="text-xs text-destructive">{formErrors.code}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-external-id">ID externe</Label>
                    <Input
                      id="supplier-external-id"
                      value={form.externalId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          externalId: sanitizeTrimmed(e.target.value, 128),
                        }))
                      }
                      placeholder="Ex: ERP-123"
                    />
                    {formErrors.externalId ? (
                      <p className="text-xs text-destructive">{formErrors.externalId}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-siret">SIRET</Label>
                    <Input
                      id="supplier-siret"
                      value={form.siret}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          siret: sanitizeDigits(e.target.value, 14),
                        }))
                      }
                      placeholder="Ex: 12345678900011"
                    />
                    {formErrors.siret ? (
                      <p className="text-xs text-destructive">{formErrors.siret}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-vat">Numéro TVA</Label>
                    <Input
                      id="supplier-vat"
                      value={form.vatNumber}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          vatNumber: sanitizeVat(e.target.value),
                        }))
                      }
                      placeholder="Ex: FR12345678901"
                    />
                    {formErrors.vatNumber ? (
                      <p className="text-xs text-destructive">{formErrors.vatNumber}</p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Contact</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-email">Email</Label>
                    <Input
                      id="supplier-email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          email: sanitizeNoSpaces(e.target.value, 255),
                        }))
                      }
                      placeholder="contact@fournisseur.com"
                    />
                    {formErrors.email ? (
                      <p className="text-xs text-destructive">{formErrors.email}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-phone">Téléphone</Label>
                    <Input
                      id="supplier-phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          phone: sanitizePhone(e.target.value),
                        }))
                      }
                      placeholder="+33 ..."
                    />
                    {formErrors.phone ? (
                      <p className="text-xs text-destructive">{formErrors.phone}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="supplier-website">Site web</Label>
                    <Input
                      id="supplier-website"
                      value={form.website}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          website: sanitizeNoSpaces(e.target.value, 512),
                        }))
                      }
                      placeholder="https://..."
                    />
                    {formErrors.website ? (
                      <p className="text-xs text-destructive">{formErrors.website}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <ImageUploadDropzone
                      id="supplier-logo-upload"
                      title="Logo fournisseur"
                      helperText="JPEG, PNG, WebP ou GIF - 2 Mo max"
                      previewUrl={newLogoPreview}
                      onFileSelected={(file) => setNewLogoFile(file)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="supplier-notes">Notes</Label>
                    <Input
                      id="supplier-notes"
                      value={form.notes}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          notes: sanitizeTrimmed(e.target.value, 2000),
                        }))
                      }
                      placeholder="Informations complémentaires"
                    />
                    {formErrors.notes ? (
                      <p className="text-xs text-destructive">{formErrors.notes}</p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Catégorisation</h3>
                <div className="space-y-2">
                  <Label>Catégorie fournisseur</Label>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={form.supplierCategoryId}
                        onValueChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            supplierCategoryId: value ?? '__none__',
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {form.supplierCategoryId === '__none__'
                              ? 'Aucune categorie'
                              : categoriesQuery.data?.items.find(
                                  (item) => item.id === form.supplierCategoryId,
                                )?.name ?? 'Categorie'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Aucune categorie</SelectItem>
                          {(categoriesQuery.data?.items ?? []).map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setNewCategoryTarget('create');
                        setNewCategoryModalOpen(true);
                      }}
                      disabled={!canCreateSuppliers}
                    >
                      + Catégorie
                    </Button>
                  </div>
                </div>
              </section>
            </div>
            <Dialog
              open={newCategoryModalOpen}
              onOpenChange={(open) => {
                setNewCategoryModalOpen(open);
                if (!open) setNewCategoryTarget('create');
              }}
            >
              <DialogContent className="w-[40rem] max-w-[90vw] p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    Nouvelle catégorie
                  </DialogTitle>
                  <DialogDescription>
                    Ajoute une catégorie fournisseur pour le client actif.
                  </DialogDescription>
                </DialogHeader>
                <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                  <div className="space-y-2">
                    <Label htmlFor="new-supplier-category-name">Nom de la catégorie</Label>
                    <Input
                      id="new-supplier-category-name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ex: Cloud"
                    />
                  </div>
                </section>
                {createCategoryMutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Création catégorie impossible</AlertTitle>
                    <AlertDescription>
                      {(createCategoryMutation.error as Error)?.message ??
                        'Impossible de créer la catégorie.'}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewCategoryModalOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const name = newCategoryName.trim();
                      if (!name) return;
                      void createCategoryMutation.mutateAsync(name);
                    }}
                    disabled={
                      createCategoryMutation.isPending || newCategoryName.trim().length === 0
                    }
                  >
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {createSupplierMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Création impossible</AlertTitle>
                <AlertDescription>
                  {(createSupplierMutation.error as Error)?.message ??
                    'Impossible de créer le fournisseur.'}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewSupplierModalOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => void createSupplierMutation.mutateAsync()}
                disabled={createSupplierMutation.isPending || form.name.trim().length === 0}
              >
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={editSupplierModalOpen}
          onOpenChange={(open) => {
            setEditSupplierModalOpen(open);
            if (!open) {
              setEditLogoFile(null);
              setEditLogoPreview(null);
              setEditingContactId(null);
              setContactFormErrors({});
              setContactForm({
                firstName: '',
                lastName: '',
                fullName: '',
                role: '',
                email: '',
                phone: '',
                mobile: '',
                notes: '',
                isPrimary: false,
              });
            }
          }}
        >
          <DialogContent className="flex max-h-[90vh] !w-[90vw] !max-w-[90vw] sm:!max-w-[90vw] flex-col gap-4 overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Fiche fournisseur
              </DialogTitle>
              <DialogDescription>
                Consulte et modifie les informations du fournisseur.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <section className="rounded-xl border border-border/70 bg-muted/20 p-3 lg:col-span-4">
                <ImageUploadDropzone
                  id="supplier-logo-upload-edit"
                  title="Logo fournisseur"
                  helperText="JPEG, PNG, WebP ou GIF - 2 Mo max"
                  previewUrl={editLogoPreview}
                  onFileSelected={(file) => setEditLogoFile(file)}
                  onRemove={
                    selectedSupplierId
                      ? () => {
                          void (async () => {
                            await deleteSupplierLogo(authFetch, selectedSupplierId);
                            setEditLogoFile(null);
                            setEditLogoPreview(null);
                            await queryClient.invalidateQueries({
                              queryKey: ['procurement', clientId, 'suppliers-page'],
                            });
                          })();
                        }
                      : undefined
                  }
                  disabled={updateSupplierMutation.isPending}
                />
              </section>

              <div className="space-y-4 lg:col-span-8">
                <section className="rounded-xl border border-border/70 bg-card p-3">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Identite</h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nom *" />
                      {editFormErrors.name ? <p className="text-xs text-destructive">{editFormErrors.name}</p> : null}
                    </div>
                    <div className="space-y-1">
                      <Input value={editForm.code} onChange={(e) => setEditForm((p) => ({ ...p, code: sanitizeTrimmed(e.target.value, 64) }))} placeholder="Code" />
                      {editFormErrors.code ? <p className="text-xs text-destructive">{editFormErrors.code}</p> : null}
                    </div>
                    <div className="space-y-1">
                      <Input value={editForm.siret} onChange={(e) => setEditForm((p) => ({ ...p, siret: sanitizeDigits(e.target.value, 14) }))} placeholder="SIRET" />
                      {editFormErrors.siret ? <p className="text-xs text-destructive">{editFormErrors.siret}</p> : null}
                    </div>
                    <div className="space-y-1">
                      <Input value={editForm.vatNumber} onChange={(e) => setEditForm((p) => ({ ...p, vatNumber: sanitizeVat(e.target.value) }))} placeholder="Numero TVA" />
                      {editFormErrors.vatNumber ? <p className="text-xs text-destructive">{editFormErrors.vatNumber}</p> : null}
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Input value={editForm.externalId} onChange={(e) => setEditForm((p) => ({ ...p, externalId: sanitizeTrimmed(e.target.value, 128) }))} placeholder="ID externe" />
                      {editFormErrors.externalId ? <p className="text-xs text-destructive">{editFormErrors.externalId}</p> : null}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-border/70 bg-card p-3">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Contact et categorie</h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Input value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: sanitizeNoSpaces(e.target.value, 255) }))} placeholder="Email" />
                      {editFormErrors.email ? <p className="text-xs text-destructive">{editFormErrors.email}</p> : null}
                    </div>
                    <div className="space-y-1">
                      <Input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: sanitizePhone(e.target.value) }))} placeholder="Telephone" />
                      {editFormErrors.phone ? <p className="text-xs text-destructive">{editFormErrors.phone}</p> : null}
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Input value={editForm.website} onChange={(e) => setEditForm((p) => ({ ...p, website: sanitizeNoSpaces(e.target.value, 512) }))} placeholder="Site web" />
                      {editFormErrors.website ? <p className="text-xs text-destructive">{editFormErrors.website}</p> : null}
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Select
                            value={editForm.supplierCategoryId}
                            onValueChange={(value) =>
                              setEditForm((p) => ({ ...p, supplierCategoryId: value ?? '__none__' }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {editForm.supplierCategoryId === '__none__'
                                  ? 'Aucune categorie'
                                  : categoriesQuery.data?.items.find((item) => item.id === editForm.supplierCategoryId)?.name ?? 'Categorie'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Aucune categorie</SelectItem>
                              {(categoriesQuery.data?.items ?? []).map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setNewCategoryTarget('edit');
                            setNewCategoryModalOpen(true);
                          }}
                          disabled={!canCreateSuppliers}
                        >
                          + Categorie
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Input value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: sanitizeTrimmed(e.target.value, 2000) }))} placeholder="Notes" />
                      {editFormErrors.notes ? <p className="mt-1 text-xs text-destructive">{editFormErrors.notes}</p> : null}
                    </div>
                  </div>
                </section>
              </div>
            </div>
            <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Contacts</h3>
                  <p className="text-xs text-muted-foreground">Liste des contacts existants du fournisseur.</p>
                </div>
                <Button type="button" size="sm" onClick={openCreateContactModal}>
                  + Contact
                </Button>
              </div>

              {supplierContactsQuery.isLoading ? (
                <div className="mt-3">
                  <LoadingState rows={3} />
                </div>
              ) : (
                <div className="mt-3 overflow-hidden rounded-md border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telephone</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(supplierContactsQuery.data?.items ?? []).map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">
                            {contact.fullName}{' '}
                            {contact.isPrimary ? <Badge variant="secondary">Principal</Badge> : null}
                          </TableCell>
                          <TableCell>{contact.role ?? '—'}</TableCell>
                          <TableCell>{contact.email ?? '—'}</TableCell>
                          <TableCell>{contact.phone ?? contact.mobile ?? '—'}</TableCell>
                          <TableCell>{contact.isActive ? 'Actif' : 'Inactif'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingContactId(contact.id);
                                  setContactFormErrors({});
                                  setContactForm({
                                    firstName: contact.firstName ?? '',
                                    lastName: contact.lastName ?? '',
                                    fullName: contact.fullName,
                                    role: contact.role ?? '',
                                    email: contact.email ?? '',
                                    phone: contact.phone ?? '',
                                    mobile: contact.mobile ?? '',
                                    notes: contact.notes ?? '',
                                    isPrimary: contact.isPrimary,
                                  });
                                  setContactModalOpen(true);
                                }}
                              >
                                Editer
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={
                                  deactivateSupplierContactMutation.isPending || !contact.isActive
                                }
                                onClick={() =>
                                  void deactivateSupplierContactMutation.mutateAsync(contact.id)
                                }
                              >
                                Desactiver
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
            {updateSupplierMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Mise à jour impossible</AlertTitle>
                <AlertDescription>
                  {(updateSupplierMutation.error as Error)?.message ??
                    'Impossible de mettre à jour le fournisseur.'}
                </AlertDescription>
              </Alert>
            )}
            {(createSupplierContactMutation.isError ||
              updateSupplierContactMutation.isError ||
              deactivateSupplierContactMutation.isError) && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Contact fournisseur impossible</AlertTitle>
                <AlertDescription>
                  {(
                    (createSupplierContactMutation.error as Error) ||
                    (updateSupplierContactMutation.error as Error) ||
                    (deactivateSupplierContactMutation.error as Error)
                  )?.message ?? 'Impossible de traiter le contact fournisseur.'}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditSupplierModalOpen(false)}>
                Fermer
              </Button>
              <Button
                type="button"
                onClick={() => void updateSupplierMutation.mutateAsync()}
                disabled={updateSupplierMutation.isPending || editForm.name.trim().length === 0}
              >
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <SupplierContactModal
          open={contactModalOpen}
          onOpenChange={(open) => {
            setContactModalOpen(open);
            if (!open) {
              setEditingContactId(null);
              setContactFormErrors({});
            }
          }}
          isEditing={!!editingContactId}
          supplierName={editForm.name}
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
                  [key]: sanitizeTrimmed(value, key === 'role' ? 120 : 120),
                }));
                return;
              }
            }
            setContactForm((prev) => ({ ...prev, [key]: value }));
          }}
          onSubmit={() => {
            if (editingContactId) {
              void updateSupplierContactMutation.mutateAsync();
            } else {
              void createSupplierContactMutation.mutateAsync();
            }
          }}
          isSubmitting={
            createSupplierContactMutation.isPending || updateSupplierContactMutation.isPending
          }
        />

        {permsLoading && (
          <Alert>
            <AlertTitle>Chargement des permissions</AlertTitle>
            <AlertDescription>
              Vérification des droits d&apos;accès au référentiel fournisseurs.
            </AlertDescription>
          </Alert>
        )}

        {permsError && !permsLoading && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Permissions indisponibles</AlertTitle>
            <AlertDescription>
              Impossible de charger vos permissions pour ce client.
            </AlertDescription>
          </Alert>
        )}

        {permsSuccess && !canReadSuppliers && (
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTitle>Accès au module Fournisseurs</AlertTitle>
            <AlertDescription>
              Votre rôle n&apos;inclut pas la permission <code>procurement.read</code>.
            </AlertDescription>
          </Alert>
        )}

        {permsSuccess && canReadSuppliers && (
          <Card size="sm">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-sm font-medium">Référentiel fournisseurs</CardTitle>
              <CardDescription className="text-xs">
                Recherche, ajout rapide et catégorisation dans le client actif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
                <div className="relative max-w-md">
                  <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un fournisseur"
                    className="pl-8"
                  />
                </div>
                <div className="max-w-sm">
                  <Select
                    value={supplierCategoryFilter}
                    onValueChange={(value) => setSupplierCategoryFilter(value ?? 'all')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {supplierCategoryFilter === 'all'
                          ? 'Toutes les categories'
                          : categoriesQuery.data?.items.find(
                              (item) => item.id === supplierCategoryFilter,
                            )?.name ?? 'Categorie'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les categories</SelectItem>
                      {(categoriesQuery.data?.items ?? []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {suppliersQuery.isError ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Chargement impossible</AlertTitle>
                  <AlertDescription>
                    Impossible de charger les fournisseurs.
                  </AlertDescription>
                </Alert>
              ) : suppliersQuery.isLoading ? (
                <LoadingState rows={5} />
              ) : (suppliersQuery.data?.items.length ?? 0) === 0 ? (
                <EmptyState
                  title="Aucun fournisseur"
                  description="Aucun fournisseur ne correspond à votre recherche ou filtre."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>TVA</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(suppliersQuery.data?.items ?? []).map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <button
                            type="button"
                            className="cursor-pointer text-left text-primary hover:underline"
                            onClick={() => {
                              setReadSupplierId(supplier.id);
                              setReadSupplierModalOpen(true);
                            }}
                          >
                            {supplier.name}
                          </button>
                        </TableCell>
                        <TableCell>{supplier.code ?? '—'}</TableCell>
                        <TableCell>{supplier.vatNumber ?? '—'}</TableCell>
                        <TableCell>{supplier.supplierCategory?.name ?? '—'}</TableCell>
                        <TableCell>{supplier.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <SupplierVisualizationModal
          open={readSupplierModalOpen}
          onOpenChange={setReadSupplierModalOpen}
          supplierId={readSupplierId}
          onEdit={openEditFromReadModal}
        />

        <Dialog
          open={newCategoryModalOpen && newCategoryTarget === 'edit'}
          onOpenChange={(open) => {
            setNewCategoryModalOpen(open);
            if (!open) setNewCategoryTarget('create');
          }}
        >
          <DialogContent className="w-[40rem] max-w-[90vw] p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Nouvelle categorie
              </DialogTitle>
              <DialogDescription>
                Ajoute une categorie fournisseur pour le client actif.
              </DialogDescription>
            </DialogHeader>
            <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="new-supplier-category-name-edit">Nom de la categorie</Label>
                <Input
                  id="new-supplier-category-name-edit"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Cloud"
                />
              </div>
            </section>
            {createCategoryMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Creation categorie impossible</AlertTitle>
                <AlertDescription>
                  {(createCategoryMutation.error as Error)?.message ??
                    'Impossible de creer la categorie.'}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewCategoryModalOpen(false);
                  setNewCategoryTarget('create');
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const name = newCategoryName.trim();
                  if (!name) return;
                  void createCategoryMutation.mutateAsync(name);
                }}
                disabled={createCategoryMutation.isPending || newCategoryName.trim().length === 0}
              >
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </RequireActiveClient>
  );
}
