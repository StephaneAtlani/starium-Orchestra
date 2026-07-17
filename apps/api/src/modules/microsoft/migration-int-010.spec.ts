import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * RFC-PROJ-INT-010 — gate migration SQL (Lot 1).
 * Vérification statique du fichier migration ; la validation runtime en base (\di, insert concurrent)
 * reste manuelle avant déploiement.
 *
 * FK hors scope CASCADE (SET NULL) : microsoftConnectionId, triggeredByUserId,
 * resolvedByUserId sur ProjectMicrosoftTeamsProvisioning ; provisioningId sur ProjectMicrosoftLink.
 */
describe('RFC-PROJ-INT-010 migration SQL', () => {
  const migrationPath = join(
    __dirname,
    '../../../prisma/migrations/20260717100000_project_microsoft_teams_provisioning/migration.sql',
  );

  const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

  const sql = normalize(readFileSync(migrationPath, 'utf8'));

  const expectPattern = (pattern: RegExp) => {
    expect(sql).toMatch(pattern);
  };

  describe('A. index partiels uniques', () => {
    it('un seul canal principal par client', () => {
      expectPattern(
        /CREATE UNIQUE INDEX "ProjectMicrosoftTeamsChannelTemplate_one_primary_per_client_idx"\s+ON "ProjectMicrosoftTeamsChannelTemplate"\("clientId"\)\s+WHERE "isPrimary" = true/i,
      );
    });

    it('un seul run actif par projet', () => {
      expectPattern(
        /CREATE UNIQUE INDEX "ProjectMicrosoftTeamsProvisioning_one_active_run_per_project_idx"\s+ON "ProjectMicrosoftTeamsProvisioning"\("clientId", "projectId"\)\s+WHERE "status" IN \('PENDING', 'IN_PROGRESS'\)/i,
      );
    });
  });

  describe('B. contrainte unique (clientId, displayName)', () => {
    it('unicité displayName par client', () => {
      expectPattern(
        /CREATE UNIQUE INDEX "ProjectMicrosoftTeamsChannelTemplate_clientId_displayName_key"\s+ON "ProjectMicrosoftTeamsChannelTemplate"\("clientId", "displayName"\)/i,
      );
    });
  });

  describe('C. clés étrangères ON DELETE CASCADE', () => {
    it('ProjectMicrosoftTeamsProvisioningSettings.clientId → Client', () => {
      expectPattern(
        /ALTER TABLE "ProjectMicrosoftTeamsProvisioningSettings"\s+ADD CONSTRAINT "ProjectMicrosoftTeamsProvisioningSettings_clientId_fkey"\s+FOREIGN KEY \("clientId"\) REFERENCES "Client"\("id"\) ON DELETE CASCADE/i,
      );
    });

    it('ProjectMicrosoftTeamsChannelTemplate.clientId → Client', () => {
      expectPattern(
        /ALTER TABLE "ProjectMicrosoftTeamsChannelTemplate"\s+ADD CONSTRAINT "ProjectMicrosoftTeamsChannelTemplate_clientId_fkey"\s+FOREIGN KEY \("clientId"\) REFERENCES "Client"\("id"\) ON DELETE CASCADE/i,
      );
    });

    it('ProjectMicrosoftTeamsChannelTemplate.settingsId → Settings', () => {
      expectPattern(
        /ALTER TABLE "ProjectMicrosoftTeamsChannelTemplate"\s+ADD CONSTRAINT "ProjectMicrosoftTeamsChannelTemplate_settingsId_fkey"\s+FOREIGN KEY \("settingsId"\) REFERENCES "ProjectMicrosoftTeamsProvisioningSettings"\("id"\) ON DELETE CASCADE/i,
      );
    });

    it('ProjectMicrosoftTeamsProvisioning.clientId → Client', () => {
      expectPattern(
        /ALTER TABLE "ProjectMicrosoftTeamsProvisioning"\s+ADD CONSTRAINT "ProjectMicrosoftTeamsProvisioning_clientId_fkey"\s+FOREIGN KEY \("clientId"\) REFERENCES "Client"\("id"\) ON DELETE CASCADE/i,
      );
    });

    it('ProjectMicrosoftTeamsProvisioning.projectId → Project', () => {
      expectPattern(
        /ALTER TABLE "ProjectMicrosoftTeamsProvisioning"\s+ADD CONSTRAINT "ProjectMicrosoftTeamsProvisioning_projectId_fkey"\s+FOREIGN KEY \("projectId"\) REFERENCES "Project"\("id"\) ON DELETE CASCADE/i,
      );
    });
  });
});
