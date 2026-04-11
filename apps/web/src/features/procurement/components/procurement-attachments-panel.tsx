'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Archive, Download, FileStack, FileType2, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast';
import {
  useInvoiceAttachmentMutations,
  useInvoiceAttachments,
  usePurchaseOrderAttachmentMutations,
  usePurchaseOrderAttachments,
} from '../hooks/use-procurement-attachments';
import type { ProcurementAttachmentCategory } from '../types/procurement-attachment.types';
import {
  procurementAttachmentCategoryLabel,
  procurementAttachmentCategorySelectOptions,
} from '../lib/procurement-attachment-category-labels';
import { defaultPoAttachmentDisplayName } from './procurement-po-pending-documents-section';

const ACCEPT_EXT = /\.(pdf|png|jpe?g)$/i;
const ACCEPT_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);

function isAcceptedUploadFile(file: File): boolean {
  if (file.type && ACCEPT_MIME.has(file.type)) return true;
  if (file.type === 'application/octet-stream' && ACCEPT_EXT.test(file.name)) return true;
  if (!file.type && ACCEPT_EXT.test(file.name)) return true;
  return ACCEPT_EXT.test(file.name);
}

function formatPickSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}

function formatBytes(n: number | null): string {
  if (n == null || n < 0) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function uploaderLabel(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

export function ProcurementAttachmentsPanel(props: {
  parent: { kind: 'purchase-order'; id: string } | { kind: 'invoice'; id: string };
  canList: boolean;
  canUpload: boolean;
  uploadBlockedMessage?: string | null;
}) {
  const { parent, canList, canUpload, uploadBlockedMessage } = props;
  const uid = useId();
  const fileInputId = `proc-attach-file-${uid}`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const poQuery = usePurchaseOrderAttachments(
    parent.kind === 'purchase-order' ? parent.id : null,
    canList && parent.kind === 'purchase-order',
  );
  const invQuery = useInvoiceAttachments(
    parent.kind === 'invoice' ? parent.id : null,
    canList && parent.kind === 'invoice',
  );

  const poMut = usePurchaseOrderAttachmentMutations(
    parent.kind === 'purchase-order' ? parent.id : null,
  );
  const invMut = useInvoiceAttachmentMutations(parent.kind === 'invoice' ? parent.id : null);

  const query = parent.kind === 'purchase-order' ? poQuery : invQuery;
  const mut = parent.kind === 'purchase-order' ? poMut : invMut;

  const parentKind = parent.kind === 'purchase-order' ? 'purchase-order' : 'invoice';
  const categoryOptions = useMemo(
    () => procurementAttachmentCategorySelectOptions(parentKind),
    [parentKind],
  );

  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<ProcurementAttachmentCategory>(() =>
    parent.kind === 'purchase-order' ? 'QUOTE_PDF' : 'INVOICE',
  );
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setCategory(parent.kind === 'purchase-order' ? 'QUOTE_PDF' : 'INVOICE');
    setFile(null);
    setDocName('');
  }, [parent.kind, parent.id]);

  useEffect(() => {
    if (!categoryOptions.some((o) => o.value === category)) {
      setCategory(parent.kind === 'purchase-order' ? 'QUOTE_PDF' : 'INVOICE');
    }
  }, [category, categoryOptions, parent.kind]);

  const pickFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!isAcceptedUploadFile(f)) {
      toast.error('Format non accepté (PDF, PNG, JPEG).');
      return;
    }
    setFile(f);
    setDocName('');
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !canUpload) return;
    const displayName = docName.trim() || defaultPoAttachmentDisplayName(file);
    mut.upload.mutate(
      { file, name: displayName, category },
      {
        onSuccess: () => {
          setFile(null);
          setDocName('');
          setCategory(parent.kind === 'purchase-order' ? 'QUOTE_PDF' : 'INVOICE');
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      },
    );
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const onDropZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDropZoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setIsDragging(false);
  };

  const onDropZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  const attachments = query.data ?? [];

  const selectedCategoryLabel =
    categoryOptions.find((o) => o.value === category)?.label ??
    procurementAttachmentCategoryLabel(category, parentKind);

  const isPo = parent.kind === 'purchase-order';
  const mainTitle = isPo ? 'Devis & bon de commande' : 'Facture & justificatifs';
  const mainSubtitle =
    'Liste des pièces dans ce bloc, puis envoi d’un nouveau fichier tout en bas.';

  const shellClass = canUpload
    ? 'relative overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
    : 'relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]';

  return (
    <div className={shellClass}>
      {canUpload ? (
        <div
          className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-primary/[0.14] blur-3xl"
          aria-hidden
        />
      ) : null}

      <div
        className={
          canUpload
            ? 'relative border-b border-primary/10 bg-gradient-to-r from-primary/[0.09] via-primary/[0.04] to-transparent px-5 py-4 sm:px-6'
            : 'relative border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6'
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div
            className={
              canUpload
                ? 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20'
                : 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border'
            }
          >
            <FileStack className="size-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">GED</p>
            <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">{mainTitle}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{mainSubtitle}</p>
          </div>
        </div>
      </div>

      <div className="relative space-y-5 p-5 sm:p-6">
        {canList && !canUpload && uploadBlockedMessage && (
          <Alert className="border-border/80 bg-muted/40">
            <AlertTitle>Envoi de fichiers indisponible</AlertTitle>
            <AlertDescription>{uploadBlockedMessage}</AlertDescription>
          </Alert>
        )}

        {canList && !canUpload && !uploadBlockedMessage && (
          <Alert className="border-amber-500/35 bg-amber-50/90 dark:border-amber-500/25 dark:bg-amber-950/50">
            <AlertTitle className="text-amber-950 dark:text-amber-50">Envoi réservé aux profils autorisés</AlertTitle>
            <AlertDescription className="text-amber-900/95 dark:text-amber-100/90">
              La permission <strong className="font-semibold">procurement.update</strong> est requise pour déposer des
              fichiers. La liste ci-dessous reste consultable en lecture seule.
            </AlertDescription>
          </Alert>
        )}

        {canList && query.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Chargement de la liste…
          </div>
        )}

        {canList && query.isError && (
          <p className="text-sm text-destructive">Impossible de charger la liste des documents.</p>
        )}

        {canList && query.isSuccess && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Fichiers enregistrés
            </p>
            {attachments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun document pour l’instant.
              </p>
            ) : (
              <ul className="space-y-2">
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/15 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                        <span className="shrink-0 rounded-md bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary">
                          {procurementAttachmentCategoryLabel(a.category, parent.kind)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[a.originalFilename, formatBytes(a.sizeBytes)].filter(Boolean).join(' · ')}
                        {a.uploadedBy ? ` · ${uploaderLabel(a.uploadedBy)}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          void mut.download(a.id).catch((err: Error & { message?: string }) => {
                            toast.error(err?.message ?? 'Téléchargement impossible.');
                          });
                        }}
                      >
                        <Download className="size-3.5" aria-hidden />
                        Télécharger
                      </Button>
                      {canUpload && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={mut.archive.isPending}
                          onClick={() => {
                            if (
                              confirm(
                                'Archiver ce document ? Il ne sera plus affiché dans la liste des actifs.',
                              )
                            ) {
                              mut.archive.mutate(a.id);
                            }
                          }}
                        >
                          <Archive className="size-3.5" aria-hidden />
                          Archiver
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {canUpload && (
          <form
            onSubmit={handleUpload}
            className={
              canList
                ? 'mt-6 space-y-5 border-t border-border/60 pt-6'
                : 'space-y-5'
            }
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Ajouter un document
            </p>
            <div className="rounded-xl border border-dashed border-primary/30 bg-gradient-to-b from-primary/[0.04] to-transparent p-4 sm:p-5 space-y-5">
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  pickFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />

              <div
                onDragOver={onDropZoneDragOver}
                onDragLeave={onDropZoneDragLeave}
                onDrop={onDropZoneDrop}
                className={
                  isDragging
                    ? 'rounded-xl border-2 border-primary border-dashed bg-primary/[0.06] px-4 py-8 text-center transition-colors'
                    : 'rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/35'
                }
              >
                {file ? (
                  <div className="space-y-3 text-left sm:text-center">
                    <div className="flex flex-col gap-2 sm:mx-auto sm:max-w-md sm:items-center">
                      <FileType2 className="mx-auto size-9 text-muted-foreground/70" strokeWidth={1.25} aria-hidden />
                      <p className="truncate text-sm font-medium text-foreground" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatPickSize(file.size)}</p>
                      <div className="flex flex-wrap justify-center gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={openFilePicker}>
                          Choisir un autre fichier
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 size-9 text-muted-foreground/70" strokeWidth={1.25} aria-hidden />
                    <p className="text-sm font-medium text-foreground">Déposez un fichier ou parcourez</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF, PNG ou JPEG — taille maximale conforme à la politique serveur (souvent 15&nbsp;Mo).
                    </p>
                    <Button type="button" variant="secondary" className="mt-4" onClick={openFilePicker}>
                      Parcourir…
                    </Button>
                  </>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Type de document</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as ProcurementAttachmentCategory)}
                  >
                    <SelectTrigger className="h-10 w-full bg-background">
                      <SelectValue placeholder="Type de document">{selectedCategoryLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`proc-attach-name-${uid}`} className="text-xs font-medium text-muted-foreground">
                    Titre affiché <span className="font-normal opacity-75">(optionnel)</span>
                  </Label>
                  <Input
                    id={`proc-attach-name-${uid}`}
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder={file ? defaultPoAttachmentDisplayName(file) : 'Libellé dans la GED'}
                    className="bg-background"
                    autoComplete="off"
                    disabled={!file}
                  />
                  {file ? (
                    <p className="text-[11px] text-muted-foreground">
                      Si vide, le titre sera :{' '}
                      <strong className="font-medium text-foreground">
                        « {defaultPoAttachmentDisplayName(file)} »
                      </strong>
                    </p>
                  ) : null}
                </div>
              </div>

              <Button
                type="submit"
                disabled={!file || mut.upload.isPending}
                size="lg"
                className="w-full gap-2 shadow-sm sm:w-auto sm:min-w-[200px]"
              >
                {mut.upload.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="size-4" aria-hidden />
                )}
                Envoyer le document
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
