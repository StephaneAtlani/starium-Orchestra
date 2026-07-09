'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import {
  ResourceAclEditor,
  type ResourceAclEditorHeaderStatus,
  type ResourceAclEditorProps,
} from './resource-acl-editor';

interface Props extends ResourceAclEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResourceAclDialog({ open, onOpenChange, ...editorProps }: Props) {
  const [headerStatus, setHeaderStatus] = useState<ResourceAclEditorHeaderStatus>({
    state: 'idle',
  });

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex flex-wrap items-center gap-2 gap-y-1">
          Accès à la ressource
          <Badge variant="secondary" className="shrink-0 font-normal text-muted-foreground">
            ACL ressource
          </Badge>
        </span>
      }
      description={
        <>
          <span className="font-medium text-foreground">{editorProps.resourceLabel}</span> —
          Utilisateurs et groupes autorisés ; sans entrée, le RBAC client s&apos;applique (mode
          public).
        </>
      }
      icon={ShieldCheck}
      size="xl"
      contentClassName="max-h-[min(90vh,840px)] w-full gap-4 overflow-y-auto sm:max-w-3xl lg:max-w-4xl"
      status={<ResourceAclDialogStatusLine status={headerStatus} />}
      bodyClassName="flex flex-col gap-4"
    >
      <div data-testid="resource-acl-dialog-layout">
        <ResourceAclEditor {...editorProps} onHeaderStatusChange={setHeaderStatus} />
      </div>
    </StariumModal>
  );
}

function ResourceAclDialogStatusLine({
  status,
}: {
  status: ResourceAclEditorHeaderStatus;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      role="status"
      aria-live="polite"
      data-testid="resource-acl-dialog-status"
    >
      {status.state === 'loading' || status.state === 'working' ? (
        <>
          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
          <span>
            {status.state === 'loading'
              ? 'Chargement des permissions…'
              : status.message}
          </span>
        </>
      ) : (
        <>
          <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground/90" aria-hidden />
          <span>Les modifications sont enregistrées immédiatement.</span>
        </>
      )}
    </div>
  );
}
