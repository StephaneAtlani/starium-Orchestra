'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(90vh,840px)] w-full gap-4 overflow-y-auto sm:max-w-3xl lg:max-w-4xl"
      >
        <div
          className="flex flex-col gap-4"
          data-testid="resource-acl-dialog-layout"
        >
          <DialogHeader className="-mx-4 -mt-4 space-y-3 rounded-t-xl border-b border-border/60 bg-card pb-4 pl-7 pr-4 pt-4 text-left shadow-sm sm:pl-8">
            <div className="pr-8">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <DialogTitle className="text-left">Accès à la ressource</DialogTitle>
                <Badge
                  variant="secondary"
                  className="shrink-0 font-normal text-muted-foreground"
                >
                  ACL ressource
                </Badge>
              </div>
              <DialogDescription className="mt-2 text-left leading-relaxed">
                <span className="font-medium text-foreground">
                  {editorProps.resourceLabel}
                </span>
                {' '}
                — Utilisateurs et groupes autorisés ; sans entrée, le RBAC client
                s&apos;applique (mode public).
              </DialogDescription>
            </div>
            <ResourceAclDialogStatusLine status={headerStatus} />
          </DialogHeader>

          <ResourceAclEditor
            {...editorProps}
            onHeaderStatusChange={setHeaderStatus}
          />
        </div>
      </DialogContent>
    </Dialog>
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
          <Loader2
            className="size-3.5 shrink-0 animate-spin text-primary"
            aria-hidden
          />
          <span>
            {status.state === 'loading'
              ? 'Chargement des permissions…'
              : status.message}
          </span>
        </>
      ) : (
        <>
          <ShieldCheck
            className="size-3.5 shrink-0 text-muted-foreground/90"
            aria-hidden
          />
          <span>Les modifications sont enregistrées immédiatement.</span>
        </>
      )}
    </div>
  );
}
