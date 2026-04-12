'use client';

import { useEffect, useId, useState } from 'react';
import { Archive, Download, FileStack, Loader2 } from 'lucide-react';
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
  useContractAttachmentMutations,
  useContractAttachments,
} from '../hooks/use-contract-attachments';
import type { ContractAttachmentCategory } from '../types/contract.types';
import {
  contractAttachmentCategoryLabel,
  contractAttachmentCategoryOptions,
} from '../lib/contracts-labels';
import { ContractAttachmentFilePicker } from './contract-attachment-file-picker';

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

export function ContractAttachmentsPanel(props: {
  contractId: string;
  canList: boolean;
  canUpload: boolean;
}) {
  const { contractId, canList, canUpload } = props;
  const uid = useId();
  const fileInputId = `contract-attach-${uid}`;
  const [attachInputKey, setAttachInputKey] = useState(0);

  const query = useContractAttachments(contractId, canList);
  const mut = useContractAttachmentMutations(contractId);

  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<ContractAttachmentCategory>('CONTRACT_PDF');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setFile(null);
    setDocName('');
    setCategory('CONTRACT_PDF');
    setAttachInputKey((k) => k + 1);
  }, [contractId]);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !canUpload) return;
    const displayName = docName.trim() || file.name.replace(/\.[^.]+$/, '');
    mut.upload.mutate(
      { file, name: displayName, category },
      {
        onSuccess: () => {
          setFile(null);
          setDocName('');
          setCategory('CONTRACT_PDF');
          setAttachInputKey((k) => k + 1);
        },
      },
    );
  };

  const attachments = query.data ?? [];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
      <div className="relative border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
            <FileStack className="size-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Documents contrat
            </p>
            <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">
              Pièces jointes
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              PDF signé, avenants, SLA — accès uniquement via la plateforme.
            </p>
          </div>
        </div>
      </div>

      <div className="relative space-y-5 p-5 sm:p-6">
        {canList && !canUpload && (
          <Alert className="border-amber-500/35 bg-amber-50/90 dark:border-amber-500/25 dark:bg-amber-950/50">
            <AlertTitle className="text-amber-950 dark:text-amber-50">
              Envoi réservé aux profils autorisés
            </AlertTitle>
            <AlertDescription className="text-amber-900/95 dark:text-amber-100/90">
              La permission <strong className="font-semibold">contracts.update</strong> est requise pour déposer des
              fichiers.
            </AlertDescription>
          </Alert>
        )}

        {canList && query.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Chargement…
          </div>
        )}

        {canList && query.isError && (
          <p className="text-sm text-destructive">Impossible de charger les documents.</p>
        )}

        {canList && query.isSuccess && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Fichiers actifs
            </p>
            {attachments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun document.
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
                          {contractAttachmentCategoryLabel(a.category)}
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
            className="space-y-4 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] p-4"
            onSubmit={handleUpload}
          >
            <p className="text-sm font-medium text-foreground">Ajouter un fichier</p>
            <ContractAttachmentFilePicker
              id={fileInputId}
              file={file}
              onFileChange={(f) => {
                setFile(f);
                if (f) setDocName('');
              }}
              inputKey={attachInputKey}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${fileInputId}-name`}>Nom affiché</Label>
                <Input
                  id={`${fileInputId}-name`}
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as ContractAttachmentCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contractAttachmentCategoryOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={!file || mut.upload.isPending}>
              {mut.upload.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                'Envoyer'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
