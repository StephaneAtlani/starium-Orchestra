import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrganizationScopeService } from './organization-scope.service';

/**
 * RFC-ACL-016 — Module transverse exposant `OrganizationScopeService`.
 *
 * Importable par tout module qui doit résoudre un verdict `ALL / OWN / SCOPE / NONE`
 * (futurs `AccessDecisionService` RFC-ACL-018, diagnostic RFC-ACL-019).
 *
 * Le service ne dépend que de `PrismaService` ; aucun couplage RBAC ni HTTP.
 */
@Module({
  imports: [PrismaModule],
  providers: [OrganizationScopeService],
  exports: [OrganizationScopeService],
})
export class OrganizationScopeModule {}
