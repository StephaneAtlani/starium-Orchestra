'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { PROJECT_REVIEW_ATTACHMENT_TYPE_LABEL } from '../constants/project-enum-labels';
import { useProjectDocumentsQuery } from '../hooks/use-project-documents-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewAttachmentType,
} from '../types/project.types';
import { Link2 } from 'lucide-react';

const URL_ATTACHMENT_TYPES: ProjectReviewAttachmentType[] = [
  'URL',
  'POWERBI_LINK',
  'SHAREPOINT_LINK',
  'OTHER',
];

type AgendaPointContext = {
  id: string;
  title: string;
  itemType: ProjectReviewAgendaItemApi['itemType'];
  decisionSummary?: string | null;
  expectedDecision?: string | null;
};

function AttachmentQuickAddShell({
  open,
  onOpenChange,
  agendaPoint,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendaPoint: AgendaPointContext;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter un document ou lien"
      description={`Rattacher une pièce au point « ${agendaPoint.title} ».`}
      icon={Link2}
      size="lg"
      contentClassName="max-h-[min(90vh,720px)] overflow-hidden"
      bodyClassName="overflow-y-auto"
      footer={footer}
    >
      <p className="mb-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        Point ODJ n° lié :{' '}
        <span className="font-medium text-foreground">{agendaPoint.title}</span>
      </p>
      {children}
    </StariumModal>
  );
}

export function ReviewAgendaAddAttachmentModal({
  open,
  onOpenChange,
  projectId,
  reviewId,
  agendaPoint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  reviewId: string;
  agendaPoint: AgendaPointContext;
}) {
  const { createAttachment } = useProjectReviewMutations(projectId);
  const documentsQuery = useProjectDocumentsQuery(projectId);
  const [attachmentType, setAttachmentType] =
    useState<ProjectReviewAttachmentType>('URL');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setAttachmentType('URL');
    setTitle('');
    setUrl('');
    setDocumentId('');
    setDescription('');
  }, [open]);

  const showUrlField = URL_ATTACHMENT_TYPES.includes(attachmentType);
  const showDocumentField =
    attachmentType === 'DOCUMENT_REFERENCE' || attachmentType === 'FILE';

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Le titre est obligatoire.');
      return;
    }
    if (showDocumentField && !documentId.trim()) {
      toast.error('Sélectionnez un document du projet.');
      return;
    }
    if (showUrlField && !url.trim()) {
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
          url: showDocumentField ? null : url.trim() || null,
          documentId: showDocumentField ? documentId.trim() : null,
          agendaItemId: agendaPoint.id,
        },
      });
      onOpenChange(false);
      toast.success('Document ou lien ajouté au point.');
    } catch {
      toast.error('Impossible d’ajouter le document ou le lien.');
    }
  };

  return (
    <AttachmentQuickAddShell
      open={open}
      onOpenChange={onOpenChange}
      agendaPoint={agendaPoint}
      footer={
        <>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={createAttachment.isPending}
            onClick={() => void handleSubmit()}
          >
            {createAttachment.isPending ? 'Ajout…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="starium-form-field">
          <Label htmlFor="agenda-att-modal-type">Type</Label>
          <select
            id="agenda-att-modal-type"
            className="starium-form-select min-h-11 w-full"
            value={attachmentType}
            onChange={(e) => setAttachmentType(e.target.value as ProjectReviewAttachmentType)}
          >
            {Object.entries(PROJECT_REVIEW_ATTACHMENT_TYPE_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="starium-form-field">
          <Label htmlFor="agenda-att-modal-title">Titre</Label>
          <Input
            id="agenda-att-modal-title"
            className="starium-form-input min-h-11"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        {showUrlField ? (
          <div className="starium-form-field">
            <Label htmlFor="agenda-att-modal-url">URL</Label>
            <Input
              id="agenda-att-modal-url"
              className="starium-form-input min-h-11"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        ) : null}
        {showDocumentField ? (
          <div className="starium-form-field">
            <Label htmlFor="agenda-att-modal-doc">Document projet</Label>
            <select
              id="agenda-att-modal-doc"
              className="starium-form-select min-h-11 w-full"
              value={documentId}
              disabled={documentsQuery.isLoading}
              onChange={(e) => setDocumentId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {(documentsQuery.data ?? []).map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="starium-form-field">
          <Label htmlFor="agenda-att-modal-desc">Description (optionnel)</Label>
          <textarea
            id="agenda-att-modal-desc"
            className="starium-form-textarea min-h-[72px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </AttachmentQuickAddShell>
  );
}
