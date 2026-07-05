'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import {
  PROJECT_REVIEW_ATTACHMENT_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectDocumentsQuery } from '../hooks/use-project-documents-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type {
  ProjectReviewAttachmentApi,
  ProjectReviewAttachmentType,
  ProjectReviewDecisionApi,
  ProjectReviewActionItemApi,
  ProjectReviewAgendaItemApi,
  ProjectReviewStatus,
} from '../types/project.types';
import { isReviewAgendaEditable } from '../lib/project-review-status';
import { ReviewEditorSection } from './review-editor-section';
import { Link2, Paperclip, Trash2 } from 'lucide-react';

const URL_TYPES: ProjectReviewAttachmentType[] = [
  'URL',
  'POWERBI_LINK',
  'SHAREPOINT_LINK',
  'OTHER',
];

type Props = {
  projectId: string;
  reviewId: string;
  status: ProjectReviewStatus;
  attachments: ProjectReviewAttachmentApi[];
  agendaItems: ProjectReviewAgendaItemApi[];
  decisions: ProjectReviewDecisionApi[];
  actionItems: ProjectReviewActionItemApi[];
  canEdit: boolean;
};

export function ReviewAttachmentsSection({
  projectId,
  reviewId,
  status,
  attachments,
  agendaItems,
  decisions,
  actionItems,
  canEdit,
}: Props) {
  const { createAttachment, deleteAttachment } = useProjectReviewMutations(projectId);
  const documentsQuery = useProjectDocumentsQuery(projectId);

  const [attachmentType, setAttachmentType] =
    useState<ProjectReviewAttachmentType>('URL');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [description, setDescription] = useState('');

  const editable = canEdit && isReviewAgendaEditable(status);

  const documentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of documentsQuery.data ?? []) {
      map.set(d.id, d.name);
    }
    return map;
  }, [documentsQuery.data]);

  const resolveDocumentLabel = (a: ProjectReviewAttachmentApi): string => {
    if (a.documentName?.trim()) return a.documentName.trim();
    if (a.documentId && documentLabelById.has(a.documentId)) {
      return documentLabelById.get(a.documentId)!;
    }
    if (a.fileName?.trim()) return a.fileName.trim();
    return 'Document projet';
  };

  const onAdd = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Le titre est obligatoire.');
      return;
    }
    const isDoc = attachmentType === 'DOCUMENT_REFERENCE' || attachmentType === 'FILE';
    if (isDoc && !documentId.trim()) {
      toast.error('Sélectionnez un document du projet.');
      return;
    }
    if (!isDoc && URL_TYPES.includes(attachmentType) && !url.trim()) {
      toast.error('L’URL est obligatoire pour ce type de lien.');
      return;
    }
    try {
      await createAttachment.mutateAsync({
        reviewId,
        body: {
          attachmentType,
          title: trimmedTitle,
          description: description.trim() || null,
          url: isDoc ? null : url.trim() || null,
          documentId: isDoc ? documentId.trim() : null,
        },
      });
      setTitle('');
      setUrl('');
      setDocumentId('');
      setDescription('');
    } catch {
      toast.error('Impossible d’ajouter le document ou le lien.');
    }
  };

  const onRemove = async (attachmentId: string) => {
    try {
      await deleteAttachment.mutateAsync({ reviewId, attachmentId });
    } catch {
      toast.error('Suppression impossible.');
    }
  };

  const showUrlField = URL_TYPES.includes(attachmentType);
  const showDocumentField =
    attachmentType === 'DOCUMENT_REFERENCE' || attachmentType === 'FILE';

  return (
    <ReviewEditorSection
      sectionId="pr-section-attachments"
      title="Documents & liens"
      description="Liens externes et références vers les documents du projet."
      icon={Paperclip}
    >
      {attachments.length === 0 ? (
        <p className="starium-form-hint">Aucun document ni lien associé.</p>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {attachments.map((a) => {
            const typeLabel =
              PROJECT_REVIEW_ATTACHMENT_TYPE_LABEL[a.attachmentType] ?? a.attachmentType;
            const isUrlType = URL_TYPES.includes(a.attachmentType);
            const href = isUrlType ? a.url : null;
            const docLabel = !isUrlType ? resolveDocumentLabel(a) : null;
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/70 bg-muted/30 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{typeLabel}</p>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="starium-link mt-1 inline-flex min-h-11 items-center gap-1 text-sm"
                    >
                      <Link2 className="size-3.5" aria-hidden />
                      {href}
                    </a>
                  ) : docLabel ? (
                    <p className="mt-1 text-sm text-foreground">{docLabel}</p>
                  ) : null}
                  {a.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                  ) : null}
                </div>
                {editable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Supprimer ${a.title}`}
                    onClick={() => void onRemove(a.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editable ? (
        <div className="mt-4 space-y-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3">
          <p className="text-sm font-medium text-foreground">Ajouter</p>
          <div className="starium-form-grid starium-form-grid--2">
            <div className="starium-form-field">
              <Label htmlFor="pr-att-type">Type</Label>
              <select
                id="pr-att-type"
                className="starium-form-select min-h-11"
                value={attachmentType}
                onChange={(e) =>
                  setAttachmentType(e.target.value as ProjectReviewAttachmentType)
                }
              >
                {Object.entries(PROJECT_REVIEW_ATTACHMENT_TYPE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="starium-form-field">
              <Label htmlFor="pr-att-title">Titre</Label>
              <Input
                id="pr-att-title"
                className="starium-form-input min-h-11"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={500}
              />
            </div>
            {showUrlField ? (
              <div className="starium-form-field starium-form-grid--span-2">
                <Label htmlFor="pr-att-url">URL</Label>
                <Input
                  id="pr-att-url"
                  type="url"
                  className="starium-form-input min-h-11"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            ) : null}
            {showDocumentField ? (
              <div className="starium-form-field starium-form-grid--span-2">
                <Label htmlFor="pr-att-doc">Document projet</Label>
                <select
                  id="pr-att-doc"
                  className="starium-form-select min-h-11"
                  value={documentId}
                  disabled={documentsQuery.isLoading}
                  onChange={(e) => setDocumentId(e.target.value)}
                >
                  <option value="">— Choisir un document —</option>
                  {(documentsQuery.data ?? [])
                    .filter((d) => d.status === 'ACTIVE')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
            <div className="starium-form-field starium-form-grid--span-2">
              <Label htmlFor="pr-att-desc">Description (optionnel)</Label>
              <textarea
                id="pr-att-desc"
                className="starium-form-textarea min-h-[64px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            className="min-h-11"
            disabled={createAttachment.isPending}
            onClick={() => void onAdd()}
          >
            {createAttachment.isPending ? 'Ajout…' : 'Ajouter le lien ou document'}
          </Button>
        </div>
      ) : null}

      {(agendaItems.length > 0 || decisions.length > 0 || actionItems.length > 0) &&
      attachments.some((a) => a.agendaItemId || a.decisionId || a.actionItemId) ? (
        <p className="starium-form-hint mt-3">
          Certains éléments sont rattachés à l&apos;ordre du jour, une décision ou une action.
        </p>
      ) : null}
    </ReviewEditorSection>
  );
}
