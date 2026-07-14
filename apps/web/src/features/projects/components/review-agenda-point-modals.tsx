'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import {
  PROJECT_PRIORITY_LABEL,
  PROJECT_REVIEW_ATTACHMENT_TYPE_LABEL,
  PROJECT_REVIEW_DECISION_STATUS_LABEL,
  PROJECT_REVIEW_DECISION_TYPE_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectDocumentsQuery } from '../hooks/use-project-documents-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewAgendaItemType,
  ProjectReviewAttachmentType,
  ProjectReviewDecisionApi,
  ProjectReviewDecisionStatus,
  ProjectReviewDecisionType,
} from '../types/project.types';
import { ProjectDatetimeLocalInput } from './project-datetime-local-input';
import {
  emptyActionRow,
  type ReviewActionFormRow,
} from './review-actions-section';
import {
  emptyDecisionRow,
  type ReviewDecisionFormRow,
} from './review-decisions-section';
import { FileText, Link2, ListChecks, ListTodo, Scale } from 'lucide-react';

const DECISION_TYPES = Object.keys(
  PROJECT_REVIEW_DECISION_TYPE_LABEL,
) as ProjectReviewDecisionType[];

const DECISION_STATUSES = Object.keys(
  PROJECT_REVIEW_DECISION_STATUS_LABEL,
) as ProjectReviewDecisionStatus[];

const URL_ATTACHMENT_TYPES: ProjectReviewAttachmentType[] = [
  'URL',
  'POWERBI_LINK',
  'SHAREPOINT_LINK',
  'OTHER',
];

function defaultDecisionTypeForAgenda(
  itemType: ProjectReviewAgendaItemType,
): ProjectReviewDecisionType {
  switch (itemType) {
    case 'ARBITRATION':
      return 'ARBITRATION';
    case 'BUDGET':
      return 'BUDGET_VALIDATION';
    case 'RISK':
      return 'RISK_ACCEPTANCE';
    default:
      return 'OTHER';
  }
}

function displayNameFromUser(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

type AgendaPointContext = {
  id: string;
  title: string;
  itemType: ProjectReviewAgendaItemApi['itemType'];
  decisionSummary?: string | null;
  expectedDecision?: string | null;
};

export type ReviewAgendaQuickAddKind = 'decision' | 'action' | 'attachment';

type QuickAddShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendaPoint: AgendaPointContext;
  kind: ReviewAgendaQuickAddKind;
  children: ReactNode;
  footer: ReactNode;
};

function QuickAddShell({
  open,
  onOpenChange,
  agendaPoint,
  kind,
  children,
  footer,
}: QuickAddShellProps) {
  const meta = {
    decision: {
      title: 'Ajouter une décision',
      description: `Formaliser une décision pour le point « ${agendaPoint.title} ».`,
      icon: Scale,
    },
    action: {
      title: 'Ajouter une action',
      description: `Planifier une action issue du point « ${agendaPoint.title} ».`,
      icon: ListTodo,
    },
    attachment: {
      title: 'Ajouter un document ou lien',
      description: `Rattacher une pièce au point « ${agendaPoint.title} ».`,
      icon: Link2,
    },
  }[kind];

  const Icon = meta.icon;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={meta.title}
      description={meta.description}
      icon={Icon}
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

export function ReviewAgendaAddDecisionModal({
  open,
  onOpenChange,
  agendaPoint,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendaPoint: AgendaPointContext;
  onSubmit: (row: ReviewDecisionFormRow) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [decisionType, setDecisionType] = useState<ProjectReviewDecisionType>('OTHER');
  const [status, setStatus] = useState<ProjectReviewDecisionStatus>('VALIDATED');
  const [impact, setImpact] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(agendaPoint.title);
    setDescription(
      agendaPoint.decisionSummary?.trim() ||
        agendaPoint.expectedDecision?.trim() ||
        '',
    );
    setDecisionType(defaultDecisionTypeForAgenda(agendaPoint.itemType));
    setStatus('VALIDATED');
    setImpact('');
  }, [open, agendaPoint]);

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Le titre de la décision est obligatoire.');
      return;
    }
    onSubmit({
      ...emptyDecisionRow(),
      title: trimmedTitle,
      description: description.trim(),
      decisionType,
      status,
      impact: impact.trim(),
      agendaItemId: agendaPoint.id,
    });
    onOpenChange(false);
    toast.success('Décision ajoutée au point.');
  };

  return (
    <QuickAddShell
      open={open}
      onOpenChange={onOpenChange}
      agendaPoint={agendaPoint}
      kind="decision"
      footer={
        <>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" className="min-h-11" onClick={handleSubmit}>
            Enregistrer la décision
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="starium-form-field sm:col-span-2">
          <Label htmlFor="agenda-dec-modal-title">Titre</Label>
          <Input
            id="agenda-dec-modal-title"
            className="starium-form-input min-h-11"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="starium-form-field">
          <Label htmlFor="agenda-dec-modal-type">Type</Label>
          <select
            id="agenda-dec-modal-type"
            className="starium-form-select min-h-11 w-full"
            value={decisionType}
            onChange={(e) => setDecisionType(e.target.value as ProjectReviewDecisionType)}
          >
            {DECISION_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROJECT_REVIEW_DECISION_TYPE_LABEL[t] ?? t}
              </option>
            ))}
          </select>
        </div>
        <div className="starium-form-field">
          <Label htmlFor="agenda-dec-modal-status">Statut</Label>
          <select
            id="agenda-dec-modal-status"
            className="starium-form-select min-h-11 w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectReviewDecisionStatus)}
          >
            {DECISION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_REVIEW_DECISION_STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div className="starium-form-field sm:col-span-2">
          <Label htmlFor="agenda-dec-modal-desc">Détail (optionnel)</Label>
          <textarea
            id="agenda-dec-modal-desc"
            className="starium-form-textarea min-h-[88px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="starium-form-field sm:col-span-2">
          <Label htmlFor="agenda-dec-modal-impact">Impact (optionnel)</Label>
          <textarea
            id="agenda-dec-modal-impact"
            className="starium-form-textarea min-h-[72px]"
            value={impact}
            placeholder="Conséquences, périmètre, budget, planning…"
            onChange={(e) => setImpact(e.target.value)}
          />
        </div>
      </div>
    </QuickAddShell>
  );
}

export function ReviewAgendaAddActionModal({
  open,
  onOpenChange,
  agendaPoint,
  reviewDecisions,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendaPoint: AgendaPointContext;
  reviewDecisions: ProjectReviewDecisionApi[];
  onSubmit: (row: ReviewActionFormRow) => void;
}) {
  const assignable = useProjectAssignableUsers();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [decisionId, setDecisionId] = useState('');

  const pointDecisions = useMemo(
    () => reviewDecisions.filter((d) => d.agendaItemId === agendaPoint.id),
    [reviewDecisions, agendaPoint.id],
  );

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setStatus('TODO');
    setPriority('MEDIUM');
    setDueDate('');
    setResponsibleUserId('');
    setDecisionId(pointDecisions[0]?.id ?? '');
  }, [open, agendaPoint.title, pointDecisions]);

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Le libellé de l’action est obligatoire.');
      return;
    }
    onSubmit({
      ...emptyActionRow(),
      title: trimmedTitle,
      description: description.trim(),
      status,
      priority,
      dueDate,
      responsibleUserId,
      decisionId,
      agendaItemId: agendaPoint.id,
    });
    onOpenChange(false);
    toast.success('Action ajoutée au point.');
  };

  return (
    <QuickAddShell
      open={open}
      onOpenChange={onOpenChange}
      agendaPoint={agendaPoint}
      kind="action"
      footer={
        <>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" className="min-h-11" onClick={handleSubmit}>
            Enregistrer l&apos;action
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="starium-form-field sm:col-span-2">
          <Label htmlFor="agenda-act-modal-title">Libellé</Label>
          <Input
            id="agenda-act-modal-title"
            className="starium-form-input min-h-11"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="starium-form-field">
          <Label htmlFor="agenda-act-modal-status">Statut</Label>
          <select
            id="agenda-act-modal-status"
            className="starium-form-select min-h-11 w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {Object.keys(TASK_STATUS_LABEL).map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div className="starium-form-field">
          <Label htmlFor="agenda-act-modal-priority">Priorité</Label>
          <select
            id="agenda-act-modal-priority"
            className="starium-form-select min-h-11 w-full"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {Object.keys(PROJECT_PRIORITY_LABEL).map((p) => (
              <option key={p} value={p}>
                {PROJECT_PRIORITY_LABEL[p] ?? p}
              </option>
            ))}
          </select>
        </div>
        <div className="starium-form-field sm:col-span-2">
          <Label htmlFor="agenda-act-modal-due">Échéance (optionnel)</Label>
          <ProjectDatetimeLocalInput
            id="agenda-act-modal-due"
            value={dueDate}
            onChange={setDueDate}
          />
        </div>
        <div className="starium-form-field sm:col-span-2">
          <Label htmlFor="agenda-act-modal-resp">Responsable (optionnel)</Label>
          <select
            id="agenda-act-modal-resp"
            className="starium-form-select min-h-11 w-full"
            value={responsibleUserId}
            disabled={assignable.isLoading}
            onChange={(e) => setResponsibleUserId(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {assignable.data?.users?.map((u) => (
              <option key={u.id} value={u.id}>
                {displayNameFromUser(u)}
              </option>
            ))}
          </select>
        </div>
        {pointDecisions.length > 0 ? (
          <div className="starium-form-field sm:col-span-2">
            <Label htmlFor="agenda-act-modal-dec">Décision liée (optionnel)</Label>
            <select
              id="agenda-act-modal-dec"
              className="starium-form-select min-h-11 w-full"
              value={decisionId}
              onChange={(e) => setDecisionId(e.target.value)}
            >
              <option value="">— Aucune —</option>
              {pointDecisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="starium-form-field sm:col-span-2">
          <Label htmlFor="agenda-act-modal-desc">Description (optionnel)</Label>
          <textarea
            id="agenda-act-modal-desc"
            className="starium-form-textarea min-h-[72px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </QuickAddShell>
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
    <QuickAddShell
      open={open}
      onOpenChange={onOpenChange}
      agendaPoint={agendaPoint}
      kind="attachment"
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
    </QuickAddShell>
  );
}

type LinkedItem = { title: string };

export function ReviewAgendaPointOutputs({
  conductEditable,
  linkedDecisions,
  linkedActions,
  linkedAttachments,
  onAddDecision,
  onAddAction,
  onAddAttachment,
}: {
  conductEditable: boolean;
  linkedDecisions: LinkedItem[];
  linkedActions: LinkedItem[];
  linkedAttachments: LinkedItem[];
  onAddDecision: () => void;
  onAddAction: () => void;
  onAddAttachment: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/10 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">Éléments rattachés à ce point</p>
      {conductEditable ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5" onClick={onAddDecision}>
            <Scale className="size-4" aria-hidden />
            Décision
          </Button>
          <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5" onClick={onAddAction}>
            <ListTodo className="size-4" aria-hidden />
            Action
          </Button>
          <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5" onClick={onAddAttachment}>
            <FileText className="size-4" aria-hidden />
            Document / lien
          </Button>
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <LinkedList title="Décisions" icon={ListChecks} items={linkedDecisions} emptyLabel="Aucune décision" />
        <LinkedList title="Actions" icon={ListTodo} items={linkedActions} emptyLabel="Aucune action" />
        <LinkedList title="Documents" icon={FileText} items={linkedAttachments} emptyLabel="Aucun document" />
      </div>
    </div>
  );
}

function LinkedList({
  title,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: typeof ListChecks;
  items: LinkedItem[];
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {title}
        <span className="tabular-nums">({items.length})</span>
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="truncate text-sm font-medium text-foreground">
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
