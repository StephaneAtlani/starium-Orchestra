'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResourceAclEditor, type ResourceAclEditorProps } from './resource-acl-editor';

interface Props extends ResourceAclEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResourceAclDialog({ open, onOpenChange, ...editorProps }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Accès à la ressource «&nbsp;{editorProps.resourceLabel}&nbsp;»
          </DialogTitle>
          <DialogDescription>
            Gérez les utilisateurs et groupes autorisés à accéder à cette ressource.
            En l&apos;absence d&apos;entrée, la ressource reste accessible selon les règles RBAC
            standards (mode public).
          </DialogDescription>
        </DialogHeader>
        <ResourceAclEditor {...editorProps} />
      </DialogContent>
    </Dialog>
  );
}
