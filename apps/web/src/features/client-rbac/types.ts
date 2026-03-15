/**
 * Types client-rbac alignés sur les réponses API (RFC-023).
 */

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDetail extends RoleListItem {
  permissionIds: string[];
}

export interface PermissionListItem {
  id: string;
  code: string;
  label: string;
  description: string | null;
  moduleCode: string;
  moduleName: string;
}

export interface UserRoleAssignment {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface CreateRoleDto {
  name: string;
  description?: string | null;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string | null;
}

export interface ReplaceRolePermissionsDto {
  permissionIds: string[];
}

export interface ReplaceUserRolesDto {
  roleIds: string[];
}
