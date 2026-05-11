import type {
  ResourceAclPermission,
  ResourceAclResourceType,
  ResourceAclSubjectType,
} from '../api/resource-acl.types';

export const RESOURCE_ACL_PERMISSION_LABEL: Record<ResourceAclPermission, string> = {
  READ: 'Lecture',
  WRITE: 'Écriture',
  ADMIN: 'Administration',
};

export const RESOURCE_ACL_PERMISSION_HINT: Record<ResourceAclPermission, string> = {
  READ: 'Consulter cette ressource (lecture seule).',
  WRITE: 'Consulter et modifier cette ressource.',
  ADMIN: 'Consulter, modifier et gérer les permissions de cette ressource.',
};

export const RESOURCE_ACL_SUBJECT_TYPE_LABEL: Record<ResourceAclSubjectType, string> = {
  USER: 'Utilisateur',
  GROUP: 'Groupe',
};

export const RESOURCE_ACL_RESOURCE_TYPE_LABEL: Record<ResourceAclResourceType, string> = {
  PROJECT: 'Projet',
  BUDGET: 'Budget',
  CONTRACT: 'Contrat',
  SUPPLIER: 'Fournisseur',
  STRATEGIC_OBJECTIVE: 'Objectif stratégique',
};
