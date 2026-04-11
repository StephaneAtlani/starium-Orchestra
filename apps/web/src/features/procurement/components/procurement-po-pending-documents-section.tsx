'use client';

import React, { useCallback, useRef, useState } from 'react';
import { FileType2, FolderOpen, Trash2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import {
  invoiceCreationDocumentTypeOptions,
  purchaseOrderCreationDocumentTypeOptions,
  type ProcurementAttachmentParentKind,
} from '../lib/procurement-attachment-category-labels';
import type { ProcurementAttachmentCategory } from '../types/procurement-attachment.types';

const ACCEPT_EXT = /\.(pdf|png|jpe?g)$/i;
const ACCEPT_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export function defaultPoAttachmentDisplayName(file: File): string {
  const name = file.name.trim();
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base.trim() || name || 'Document';
}

function isAccepted(file: File): boolean {
  if (file.type && ACCEPT_MIME.has(file.type)) return true;
  if (file.type === 'application/octet-stream' && ACCEPT_EXT.test(file.name)) return true;
  if (!file.type && ACCEPT_EXT.test(file.name)) return true;
  return ACCEPT_EXT.test(file.name);
}

export type PendingPoDocRow = {
  key: string;
  file: File;
  title: string;
  category: ProcurementAttachmentCategory;
};

type Props = {
  pendingDocs: PendingPoDocRow[];
  setPendingDocs: React.Dispatch<React.SetStateAction<PendingPoDocRow[]>>;
  idPrefix: string;
  description: React.ReactNode;
  /** Commande : devis / BC ; facture : types adaptés (facture, correspondance, etc.). */
  parentEntity?: ProcurementAttachmentParentKind;
};

function fmtSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}

export function ProcurementPoPendingDocumentsSection({
  pendingDocs,
  setPendingDocs,
  idPrefix,
  description,
  parentEntity = 'purchase-order',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const creationOptions =
    parentEntity === 'invoice' ? invoiceCreationDocumentTypeOptions : purchaseOrderCreationDocumentTypeOptions;
  const defaultCategory: ProcurementAttachmentCategory =
    parentEntity === 'invoice' ? 'INVOICE' : 'QUOTE_PDF';
  const headingTitle =
    parentEntity === 'invoice' ? 'Facture & justificatifs' : 'Devis & bon de commande';

  const addFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      if (!fileList || (fileList instanceof FileList && fileList.length === 0)) return;
      const raw = Array.from(fileList);
      const ok: File[] = [];
      let rejected = 0;
      for (const f of raw) {
        if (isAccepted(f)) ok.push(f);
        else rejected++;
      }
      if (rejected > 0) {
        toast.error(
          rejected === raw.length
            ? 'Aucun fichier accepté (PDF, PNG ou JPEG).'
            : `${rejected} fichier(s) ignoré(s) (PDF, PNG, JPEG uniquement).`,
        );
      }
      if (ok.length === 0) return;
      const rows: PendingPoDocRow[] = ok.map((file) => ({
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        title: '',
        category: defaultCategory,
      }));
      setPendingDocs((prev) => [...prev, ...rows]);
    },
    [setPendingDocs, defaultCategory],
  );

  function openPicker() {
    // display:none casse .click() sur certains navigateurs — garder l’input « présent » (sr-only).
    inputRef.current?.click();
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) addFiles(files);
    e.target.value = '';
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
      aria-labelledby={`${idPrefix}-docs-heading`}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-primary/[0.12] blur-3xl"
        aria-hidden
      />
      <div className="relative border-b border-primary/10 bg-gradient-to-r from-primary/[0.09] via-primary/[0.04] to-transparent px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20">
            <FolderOpen className="size-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p
              id={`${idPrefix}-docs-heading`}
              className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary"
            >
              Documents
            </p>
            <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground">
              {headingTitle}
            </h3>
            <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={onInputChange}
        />

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors',
            pendingDocs.length === 0 ? 'px-4 py-12' : 'hidden',
            isDragging
              ? 'border-primary bg-primary/[0.08]'
              : 'border-muted-foreground/30 bg-muted/25',
          )}
        >
          <Upload className="mb-3 size-10 text-muted-foreground/70" strokeWidth={1.25} />
          <p className="text-sm font-medium text-foreground">Déposez des fichiers ici</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            PDF, PNG ou JPEG — une ligne par fichier. Taille maximale : 15&nbsp;Mo par fichier.
          </p>
          <button
            type="button"
            className="mt-4 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              openPicker();
            }}
          >
            Parcourir les fichiers…
          </button>
        </div>

        {/* Liste des fichiers ajoutés */}
        {pendingDocs.length > 0 && (
          <>
            <ul className="space-y-4">
              {pendingDocs.map((row, index) => {
                const autoLabel = defaultPoAttachmentDisplayName(row.file);
                return (
                  <li
                    key={row.key}
                    className="relative rounded-xl border border-border/80 bg-background/95 p-4 shadow-sm ring-1 ring-black/[0.03] dark:bg-background/80 dark:ring-white/[0.04] sm:p-5"
                  >
                    <div className="absolute left-0 top-4 hidden h-[calc(100%-2rem)] w-1 rounded-r-full bg-primary/70 sm:block" />
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-2 sm:pl-2">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-2 rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {index + 1}
                          </span>
                          Document
                        </span>
                        <p className="mt-2 truncate text-sm font-medium text-foreground" title={row.file.name}>
                          {row.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtSize(row.file.size)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <label
                          htmlFor={`${idPrefix}-replace-${row.key}`}
                          className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Remplacer
                        </label>
                        <input
                          id={`${idPrefix}-replace-${row.key}`}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                          className="sr-only"
                          tabIndex={-1}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (!f) return;
                            if (!isAccepted(f)) {
                              toast.error('Format non accepté (PDF, PNG, JPEG).');
                              return;
                            }
                            setPendingDocs((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, file: f, title: '' } : r,
                              ),
                            );
                          }}
                        />
                        <button
                          type="button"
                          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Retirer ce document"
                          onClick={() => setPendingDocs((prev) => prev.filter((r) => r.key !== row.key))}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 sm:pl-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                        <Select
                          value={row.category}
                          onValueChange={(v) =>
                            setPendingDocs((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, category: v as ProcurementAttachmentCategory } : r,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="h-10 w-full bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {creationOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label
                          htmlFor={`${idPrefix}-title-${row.key}`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Libellé <span className="font-normal opacity-80">(optionnel)</span>
                        </Label>
                        <Input
                          id={`${idPrefix}-title-${row.key}`}
                          value={row.title}
                          onChange={(e) =>
                            setPendingDocs((prev) =>
                              prev.map((r) => (r.key === row.key ? { ...r, title: e.target.value } : r)),
                            )
                          }
                          placeholder={autoLabel}
                          className="bg-background"
                          autoComplete="off"
                        />
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          Si vide : <strong className="font-medium text-foreground">« {autoLabel} »</strong>
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Zone ajouter d'autres fichiers */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors',
                isDragging
                  ? 'border-primary bg-primary/[0.08]'
                  : 'border-muted-foreground/30 bg-muted/25',
              )}
            >
              <FileType2 className="mb-2 size-7 text-muted-foreground/60" strokeWidth={1.25} />
              <p className="text-sm font-medium text-foreground">Ajouter d&apos;autres fichiers</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Glisser-déposer, parcourir — 15&nbsp;Mo maximum par fichier.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  openPicker();
                }}
              >
                <Upload className="size-4" aria-hidden />
                Parcourir…
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
