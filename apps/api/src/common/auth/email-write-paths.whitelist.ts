/**
 * Liste blanche des flux F1–F12 devant passer par EmailReservationService (test T63).
 * Toute nouvelle mutation e-mail doit être ajoutée ici et branchée sur le service.
 */
export const EMAIL_WRITE_PATH_WHITELIST = [
  'src/modules/users/users.service.ts',
  'src/modules/clients/client-membership.service.ts',
  'src/modules/me/me.service.ts',
  'src/modules/team-directory/team-directory.service.ts',
  'src/modules/collaborators/collaborators.service.ts',
  'src/common/auth/directory-identity-provisioning.util.ts',
  'scripts/reconcile-directory-duplicate-users.ts',
] as const;

export type EmailWritePath = (typeof EMAIL_WRITE_PATH_WHITELIST)[number];
