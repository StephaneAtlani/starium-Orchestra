'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  archiveSkill,
  createSkill,
  restoreSkill,
  updateSkill,
} from '../api/skills.api';
import {
  createSkillCategory,
  deleteSkillCategory,
  updateSkillCategory,
} from '../api/skill-categories.api';
import { skillQueryKeys } from '../lib/skill-query-keys';
import type {
  CreateSkillCategoryPayload,
  CreateSkillPayload,
  SkillCategoriesListParams,
  UpdateSkillCategoryPayload,
  UpdateSkillPayload,
} from '../types/skill.types';

export function useSkillMutations() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const invalidateSkills = () => {
    void qc.invalidateQueries({ queryKey: skillQueryKeys.root(clientId) });
    void qc.invalidateQueries({ queryKey: skillQueryKeys.categoriesRoot(clientId) });
    void qc.invalidateQueries({ queryKey: skillQueryKeys.categoryOptions(clientId) });
    void qc.invalidateQueries({ queryKey: skillQueryKeys.skillOptions(clientId) });
  };

  const create = useMutation({
    mutationFn: (payload: CreateSkillPayload) => createSkill(authFetch, payload),
    onSuccess: () => {
      toast.success('Compétence créée');
      invalidateSkills();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSkillPayload }) =>
      updateSkill(authFetch, id, payload),
    onSuccess: () => {
      toast.success('Compétence mise à jour');
      invalidateSkills();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: (skillId: string) => archiveSkill(authFetch, skillId),
    onSuccess: () => {
      toast.success('Compétence archivée');
      invalidateSkills();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restore = useMutation({
    mutationFn: (skillId: string) => restoreSkill(authFetch, skillId),
    onSuccess: () => {
      toast.success('Compétence restaurée');
      invalidateSkills();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, archive, restore };
}

export function useSkillCategoryMutations(categoriesParams: SkillCategoriesListParams) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const invalidateCategories = () => {
    void qc.invalidateQueries({ queryKey: skillQueryKeys.categoriesRoot(clientId) });
    void qc.invalidateQueries({
      queryKey: skillQueryKeys.categoriesList(clientId, categoriesParams),
    });
    void qc.invalidateQueries({ queryKey: skillQueryKeys.categoryOptions(clientId) });
    void qc.invalidateQueries({ queryKey: skillQueryKeys.root(clientId) });
  };

  const create = useMutation({
    mutationFn: (payload: CreateSkillCategoryPayload) =>
      createSkillCategory(authFetch, payload),
    onSuccess: () => {
      toast.success('Catégorie créée');
      invalidateCategories();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateSkillCategoryPayload;
    }) => updateSkillCategory(authFetch, id, payload),
    onSuccess: () => {
      toast.success('Catégorie mise à jour');
      invalidateCategories();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (categoryId: string) => deleteSkillCategory(authFetch, categoryId),
    onSuccess: () => {
      toast.success('Catégorie supprimée');
      invalidateCategories();
    },
    onError: (e: Error) => {
      const msg = e.message.includes('attached')
        ? 'Impossible de supprimer : des compétences sont encore rattachées à cette catégorie.'
        : e.message;
      toast.error(msg);
    },
  });

  return { create, update, remove };
}
