import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ANY_PERMISSIONS_KEY = 'require_any_permissions';

/** Au moins une des permissions doit être présente (même module métier, ex. `collaborators.*`). */
export const RequireAnyPermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_ANY_PERMISSIONS_KEY, permissions);
