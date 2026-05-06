import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('RFC-ACL-001 migration SQL', () => {
  const migrationPath = join(
    __dirname,
    '../../../prisma/migrations/20260506170000_acl_001_subscriptions_licenses/migration.sql',
  );

  it('contient le backfill role-based avec enum réels', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain(`cu."role"::text = 'CLIENT_ADMIN'`);
    expect(sql).toContain(`cu."role"::text = 'EDITOR'`);
    expect(sql).toContain(`'READ_WRITE'::"ClientUserLicenseType"`);
    expect(sql).toContain(`'NON_BILLABLE'::"ClientUserLicenseBillingMode"`);
  });

  it('contient la contrainte SQL CHECK pour subscriptionId conditionnel', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('"ClientUser_billable_subscription_check"');
    expect(sql).toContain('"subscriptionId" IS NOT NULL');
    expect(sql).toContain('"subscriptionId" IS NULL');
  });

  it('initialise le quota avec GREATEST(count, minimum)', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('GREATEST(');
    expect(sql).toContain('SELECT COUNT(*)');
  });
});
