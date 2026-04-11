'use client';

import { useState } from 'react';
import { Archive, Download, Loader2, Paperclip, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
}) {
  const { parent, canList, canUpload } = props;

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

  const categoryOptions = procurementAttachmentCategorySelectOptions(
    parent.kind === 'purchase-order' ? 'purchase-order' : 'invoice',
  );

  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<ProcurementAttachmentCategory>('OTHER');
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !canUpload) return;
    mut.upload.mutate(
      { file, name: docName || undefined, category },
      {
        onSuccess: () => {
          setFile(null);
          setDocName('');
          setCategory('OTHER');
          const input = document.getElementById('proc-attach-file') as HTMLInputElement | null;
          if (input) input.value = '';
        },
      },
    );
  };

  const attachments = query.data ?? [];

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Paperclip className="size-4 text-muted-foreground" aria-hidden />
        Documents
      </div>

      {canList && query.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Chargement des pièces jointes…
        </div>
      )}

      {canList && query.isError && (
        <p className="text-sm text-destructive">Impossible de charger la liste des documents.</p>
      )}

      {canList && query.isSuccess && attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun document actif.</p>
      )}

      {canList && attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
                  variant="outline"
                  size="sm"
                  className="gap-1"
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
                    className="gap-1 text-destructive hover:text-destructive"
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

      {canUpload && (
        <form onSubmit={handleUpload} className="space-y-3 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            PDF, JPEG ou PNG — 15&nbsp;Mo max. Téléchargement via l’API (pas d’URL signée côté navigateur).
          </p>
          <div className="space-y-2">
            <Label htmlFor="proc-attach-file" className="text-sm">
              Fichier
            </Label>
            <Input
              id="proc-attach-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proc-attach-name" className="text-sm">
              Titre (optionnel)
            </Label>
            <Input
              id="proc-attach-name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Libellé affiché"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Catégorie</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ProcurementAttachmentCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
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
          <Button type="submit" disabled={!file || mut.upload.isPending} className="gap-2">
            {mut.upload.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            Ajouter
          </Button>
        </form>
      )}
    </div>
  );
}
