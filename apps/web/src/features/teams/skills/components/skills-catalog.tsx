'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useSkillsList } from '../hooks/use-skills-list';
import { useSkillCategoriesList } from '../hooks/use-skill-categories-list';
import { useSkillCategoryOptions } from '../hooks/use-skill-category-options';
import { useSkillMutations, useSkillCategoryMutations } from '../hooks/use-skill-mutations';
import { SkillFiltersBar } from './skill-filters-bar';
import { SkillsListTable } from './skills-list-table';
import { SkillCategoriesTable } from './skill-categories-table';
import { SkillFormDialog } from './skill-form-dialog';
import { SkillCategoryFormDialog } from './skill-category-form-dialog';
import { SkillCollaboratorsDialog } from './skill-collaborators-dialog';
import type {
  SkillCategoryListItem,
  SkillListItem,
  SkillCategoriesListParams,
  SkillsListParams,
} from '../types/skill.types';
import type { SkillFormValues } from '../schemas/skill-form.schema';
import type { SkillCategoryFormValues } from '../schemas/skill-form.schema';

const defaultSkillFilters: SkillsListParams = {
  offset: 0,
  limit: 20,
  sortBy: 'name',
  sortOrder: 'asc',
};

const defaultCategoryParams: SkillCategoriesListParams = {
  offset: 0,
  limit: 50,
  sortBy: 'sortOrder',
  sortOrder: 'asc',
};

export function SkillsCatalog() {
  const { has } = usePermissions();
  const canRead = has('skills.read');
  const canCreate = has('skills.create');
  const canUpdate = has('skills.update');
  const canDelete = has('skills.delete');

  const [skillFilters, setSkillFilters] = useState<SkillsListParams>(defaultSkillFilters);
  const [categoryParams] = useState<SkillCategoriesListParams>(defaultCategoryParams);

  const skillsQuery = useSkillsList(skillFilters);
  const categoriesQuery = useSkillCategoriesList(categoryParams);
  const categoryOptionsQuery = useSkillCategoryOptions();

  const skillMutations = useSkillMutations();
  const categoryMutations = useSkillCategoryMutations(categoryParams);

  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [skillDialogMode, setSkillDialogMode] = useState<'create' | 'edit'>('create');
  const [editingSkill, setEditingSkill] = useState<SkillListItem | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<'create' | 'edit'>('create');
  const [editingCategory, setEditingCategory] = useState<SkillCategoryListItem | null>(null);

  const [collabDialogOpen, setCollabDialogOpen] = useState(false);
  const [collabSkill, setCollabSkill] = useState<SkillListItem | null>(null);
  const [catalogTab, setCatalogTab] = useState<'skills' | 'categories'>('skills');

  const categoryOptions = categoryOptionsQuery.data?.items ?? [];

  const onSkillSubmit = (values: SkillFormValues) => {
    if (skillDialogMode === 'create') {
      skillMutations.create.mutate(
        {
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          categoryId: values.categoryId,
          referenceLevel: values.referenceLevel,
          status: values.status,
        },
        {
          onSuccess: () => {
            setSkillDialogOpen(false);
          },
        },
      );
    } else if (editingSkill) {
      skillMutations.update.mutate(
        {
          id: editingSkill.id,
          payload: {
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            categoryId: values.categoryId,
            referenceLevel: values.referenceLevel,
          },
        },
        {
          onSuccess: () => {
            setSkillDialogOpen(false);
            setEditingSkill(null);
          },
        },
      );
    }
  };

  const onCategorySubmit = (values: SkillCategoryFormValues) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      sortOrder: values.sortOrder ?? 0,
    };
    if (categoryDialogMode === 'create') {
      categoryMutations.create.mutate(payload, {
        onSuccess: () => {
          setCategoryDialogOpen(false);
        },
      });
    } else if (editingCategory) {
      categoryMutations.update.mutate(
        { id: editingCategory.id, payload },
        {
          onSuccess: () => {
            setCategoryDialogOpen(false);
            setEditingCategory(null);
          },
        },
      );
    }
  };

  if (!canRead) {
    return null;
  }

  const skillsData = skillsQuery.data;
  const limit = skillFilters.limit ?? 20;
  const offset = skillFilters.offset ?? 0;
  const total = skillsData?.total ?? 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <Tabs value={catalogTab} onValueChange={(v) => setCatalogTab(v as 'skills' | 'categories')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="skills">Compétences</TabsTrigger>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            {catalogTab === 'skills' && canCreate ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSkillDialogMode('create');
                  setEditingSkill(null);
                  setSkillDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                Nouvelle compétence
              </Button>
            ) : null}
            {catalogTab === 'categories' && canCreate ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCategoryDialogMode('create');
                  setEditingCategory(null);
                  setCategoryDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                Nouvelle catégorie
              </Button>
            ) : null}
          </div>
        </div>

        <TabsContent value="skills" className="space-y-4 mt-4">
          <SkillFiltersBar
            filters={skillFilters}
            setFilters={setSkillFilters}
            categoryOptions={categoryOptions}
          />
          {skillsQuery.isLoading && !skillsData && <LoadingState rows={5} />}
          {skillsQuery.error && (
            <p className="text-sm text-destructive">{(skillsQuery.error as Error).message}</p>
          )}
          {!skillsQuery.error && skillsData && skillsData.items.length === 0 && (
            <EmptyState
              title="Aucune compétence"
              description="Ajustez les filtres ou créez une compétence."
            />
          )}
          {!skillsQuery.error && skillsData && skillsData.items.length > 0 && (
            <Card size="sm" className="overflow-hidden">
              <CardContent className="p-0 overflow-auto">
                <SkillsListTable
                  items={skillsData.items}
                  canUpdate={canUpdate}
                  onEdit={(s) => {
                    setSkillDialogMode('edit');
                    setEditingSkill(s);
                    setSkillDialogOpen(true);
                  }}
                  onArchive={(s) => {
                    if (confirm(`Archiver « ${s.name} » ?`)) {
                      skillMutations.archive.mutate(s.id);
                    }
                  }}
                  onRestore={(s) => {
                    skillMutations.restore.mutate(s.id);
                  }}
                  onOpenCollaborators={(s) => {
                    setCollabSkill(s);
                    setCollabDialogOpen(true);
                  }}
                />
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {offset + 1}–{Math.min(offset + limit, total)} sur {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setSkillFilters({ ...skillFilters, offset: Math.max(0, offset - limit) })
                    }
                  >
                    Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setSkillFilters({ ...skillFilters, offset: offset + limit })
                    }
                  >
                    Suivant
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 mt-4">
          {categoriesQuery.isLoading && !categoriesQuery.data && <LoadingState rows={4} />}
          {categoriesQuery.error && (
            <p className="text-sm text-destructive">{(categoriesQuery.error as Error).message}</p>
          )}
          {categoriesQuery.data && categoriesQuery.data.items.length === 0 && (
            <EmptyState title="Aucune catégorie" description="Créez une catégorie pour classer vos compétences." />
          )}
          {categoriesQuery.data && categoriesQuery.data.items.length > 0 && (
            <Card size="sm" className="overflow-hidden">
              <CardContent className="p-0 overflow-auto">
                <SkillCategoriesTable
                  items={categoriesQuery.data.items}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={(c) => {
                    setCategoryDialogMode('edit');
                    setEditingCategory(c);
                    setCategoryDialogOpen(true);
                  }}
                  onDelete={(c) => {
                    if (
                      confirm(
                        `Supprimer la catégorie « ${c.name} » ? (uniquement si aucune compétence rattachée.)`,
                      )
                    ) {
                      categoryMutations.remove.mutate(c.id);
                    }
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <SkillFormDialog
        open={skillDialogOpen}
        onOpenChange={setSkillDialogOpen}
        mode={skillDialogMode}
        skill={editingSkill}
        categoryOptions={categoryOptions}
        onSubmit={onSkillSubmit}
        isSubmitting={
          skillMutations.create.isPending || skillMutations.update.isPending
        }
      />

      <SkillCategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        mode={categoryDialogMode}
        category={editingCategory}
        onSubmit={onCategorySubmit}
        isSubmitting={
          categoryMutations.create.isPending || categoryMutations.update.isPending
        }
      />

      <SkillCollaboratorsDialog
        open={collabDialogOpen}
        onOpenChange={setCollabDialogOpen}
        skill={collabSkill}
      />
    </div>
  );
}
