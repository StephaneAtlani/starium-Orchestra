'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';

import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';

import { createSupplier, createSupplierCategory, updateSupplierCategory, uploadSupplierLogo } from '../../api/procurement.api';
import { listSupplierCategories } from '../../api/procurement.api';
import type { SupplierOption } from '../../types/supplier.types';
import { ImageUploadDropzone } from '../image-upload-dropzone';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

type NewSupplierDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCreated?: (supplier: SupplierOption) => void;
};

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

export function NewSupplierDialog({ open, onOpenChange, initialName, onCreated }: NewSupplierDialogProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { has } = usePermissions();
  const queryClient = useQueryClient();

  const clientId = activeClient?.id ?? '';
  const canCreateSuppliers = has('procurement.create');

  const [form, setForm] = useState<SupplierFormState>({
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
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);

  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const categoriesQuery = useQuery({
    queryKey: ['procurement', clientId, 'supplier-categories'],
    queryFn: () =>
      listSupplierCategories(authFetch, {
        includeInactive: false,
        limit: 200,
        offset: 0,
      }),
    enabled: !!clientId && open,
    staleTime: 20_000,
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createSupplierCategory(authFetch, { name }),
    onSuccess: (createdCategory) => {
      setNewCategoryName('');
      setNewCategoryModalOpen(false);
      setForm((prev) => ({ ...prev, supplierCategoryId: createdCategory.id }));
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          return Array.isArray(key) && key[0] === 'procurement' && key[1] === clientId && key[2] === 'supplier-categories';
        },
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
    if (values.email && !emailRegex.test(values.email.trim())) errors.email = 'Email invalide.';
    if (values.email.length > 255) errors.email = 'Maximum 255 caractères.';
    if (values.phone && !phoneRegex.test(values.phone.trim())) errors.phone = 'Téléphone invalide.';
    if (values.phone.length > 64) errors.phone = 'Maximum 64 caractères.';
    if (values.website && !websiteRegex.test(values.website.trim())) errors.website = 'URL invalide.';
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
    onSuccess: async (created) => {
      setNewLogoFile(null);
      setNewLogoPreview(null);
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
      setNewCategoryModalOpen(false);
      setNewCategoryName('');

      onCreated?.({ id: created.id, name: created.name });

      // Invalide les listes fournisseurs (dropdown + page) pour refléter le nouveau fournisseur.
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'procurement' &&
            key[1] === clientId &&
            (key[2] === 'suppliers-dropdown' || key[2] === 'suppliers' || key[2] === 'suppliers-page')
          );
        },
      });

      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initialName && initialName.trim()) {
      setForm((prev) => ({ ...prev, name: initialName.trim() }));
    }
  }, [open, initialName]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
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
          setNewCategoryModalOpen(false);
          setNewCategoryName('');
        }
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] !w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] flex-col gap-4 overflow-y-auto p-6"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Nouveau fournisseur</DialogTitle>
          <DialogDescription>Crée un fournisseur complet dans le client actif.</DialogDescription>
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
                {formErrors.name ? <p className="text-xs text-destructive">{formErrors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-code">Code</Label>
                <Input
                  id="supplier-code"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: sanitizeTrimmed(e.target.value, 64) }))}
                  placeholder="Ex: MSFT"
                />
                {formErrors.code ? <p className="text-xs text-destructive">{formErrors.code}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-external-id">ID externe</Label>
                <Input
                  id="supplier-external-id"
                  value={form.externalId}
                  onChange={(e) => setForm((prev) => ({ ...prev, externalId: sanitizeTrimmed(e.target.value, 128) }))}
                  placeholder="Ex: ERP-123"
                />
                {formErrors.externalId ? <p className="text-xs text-destructive">{formErrors.externalId}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-siret">SIRET</Label>
                <Input
                  id="supplier-siret"
                  value={form.siret}
                  onChange={(e) => setForm((prev) => ({ ...prev, siret: sanitizeDigits(e.target.value, 14) }))}
                  placeholder="Ex: 12345678900011"
                />
                {formErrors.siret ? <p className="text-xs text-destructive">{formErrors.siret}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-vat">Numéro TVA</Label>
                <Input
                  id="supplier-vat"
                  value={form.vatNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, vatNumber: sanitizeVat(e.target.value) }))}
                  placeholder="Ex: FR12345678901"
                />
                {formErrors.vatNumber ? <p className="text-xs text-destructive">{formErrors.vatNumber}</p> : null}
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
                  onChange={(e) => setForm((prev) => ({ ...prev, email: sanitizeNoSpaces(e.target.value, 255) }))}
                  placeholder="contact@fournisseur.com"
                />
                {formErrors.email ? <p className="text-xs text-destructive">{formErrors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-phone">Téléphone</Label>
                <Input
                  id="supplier-phone"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))}
                  placeholder="+33 ..."
                />
                {formErrors.phone ? <p className="text-xs text-destructive">{formErrors.phone}</p> : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="supplier-website">Site web</Label>
                <Input
                  id="supplier-website"
                  value={form.website}
                  onChange={(e) => setForm((prev) => ({ ...prev, website: sanitizeNoSpaces(e.target.value, 512) }))}
                  placeholder="https://..."
                />
                {formErrors.website ? <p className="text-xs text-destructive">{formErrors.website}</p> : null}
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
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: sanitizeTrimmed(e.target.value, 2000) }))}
                  placeholder="Informations complémentaires"
                />
                {formErrors.notes ? <p className="text-xs text-destructive">{formErrors.notes}</p> : null}
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
                    onValueChange={(value) => {
                      setForm((prev) => ({ ...prev, supplierCategoryId: value ?? '__none__' }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {form.supplierCategoryId === '__none__'
                          ? 'Aucune categorie'
                          : categoriesQuery.data?.items.find((item) => item.id === form.supplierCategoryId)?.name ??
                            'Categorie'}
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
                  onClick={() => setNewCategoryModalOpen(true)}
                  disabled={!canCreateSuppliers}
                >
                  + Catégorie
                </Button>
              </div>
            </div>
          </section>
        </div>

        <Dialog open={newCategoryModalOpen} onOpenChange={setNewCategoryModalOpen}>
          <DialogContent className="w-[40rem] max-w-[90vw] p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight">Nouvelle catégorie</DialogTitle>
              <DialogDescription>Ajoute une catégorie fournisseur pour le client actif.</DialogDescription>
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
                  {(createCategoryMutation.error as Error)?.message ?? 'Impossible de créer la catégorie.'}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button type="button" variant="outline" onClick={() => setNewCategoryModalOpen(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const name = newCategoryName.trim();
                  if (!name) return;
                  createCategoryMutation.mutate(name);
                }}
                disabled={createCategoryMutation.isPending || newCategoryName.trim().length === 0}
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
              {(createSupplierMutation.error as Error)?.message ?? 'Impossible de créer le fournisseur.'}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => createSupplierMutation.mutate()}
            disabled={createSupplierMutation.isPending || !canCreateSuppliers || form.name.trim().length === 0}
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

