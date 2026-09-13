'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import {
  archiveProjectDocument,
  createProjectDocument,
  deleteProjectDocument,
  downloadProjectDocument,
  updateProjectDocument,
  uploadProjectDocument,
  type CreateProjectDocumentPayload,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectDocumentApi } from '../types/project.types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useProjectDocumentMutations(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: projectQueryKeys.documents(clientId, projectId),
    });

  const upload = useMutation({
    mutationFn: (args: {
      file: File;
      name?: string;
      category?: ProjectDocumentApi['category'];
      description?: string;
    }) =>
      uploadProjectDocument(authFetch, projectId, args.file, {
        name: args.name,
        category: args.category,
        description: args.description,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success('Document ajouté.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Échec de l’upload.');
    },
  });

  const createExternal = useMutation({
    mutationFn: (payload: CreateProjectDocumentPayload) =>
      createProjectDocument(authFetch, projectId, payload),
    onSuccess: async () => {
      await invalidate();
      toast.success('Lien document ajouté.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Échec de la création.');
    },
  });

  const update = useMutation({
    mutationFn: (args: {
      documentId: string;
      name?: string;
      category?: ProjectDocumentApi['category'];
      description?: string | null;
    }) =>
      updateProjectDocument(authFetch, projectId, args.documentId, {
        name: args.name,
        category: args.category,
        description: args.description,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success('Document mis à jour.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Échec de la mise à jour.');
    },
  });

  const archive = useMutation({
    mutationFn: (documentId: string) =>
      archiveProjectDocument(authFetch, projectId, documentId),
    onSuccess: async () => {
      await invalidate();
      toast.success('Document archivé.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Échec de l’archivage.');
    },
  });

  const remove = useMutation({
    mutationFn: (documentId: string) =>
      deleteProjectDocument(authFetch, projectId, documentId),
    onSuccess: async () => {
      await invalidate();
      toast.success('Document supprimé.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Échec de la suppression.');
    },
  });

  const download = useMutation({
    mutationFn: async (documentId: string) => {
      const { blob, filename } = await downloadProjectDocument(
        authFetch,
        projectId,
        documentId,
      );
      downloadBlob(blob, filename);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Échec du téléchargement.');
    },
  });

  return { upload, createExternal, update, archive, remove, download };
}
