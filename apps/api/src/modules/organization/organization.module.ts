import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { OrganizationGroupsController } from './organization-groups.controller';
import { OrganizationGroupsService } from './organization-groups.service';
import { OrganizationOwnershipController } from './organization-ownership.controller';
import { OrganizationOwnershipPolicyService } from './organization-ownership-policy.service';
import { OrganizationUnitsController } from './organization-units.controller';
import { OrganizationUnitsService } from './organization-units.service';
import { OwnershipTransferService } from './ownership-transfer.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, FeatureFlagsModule],
  controllers: [
    OrganizationUnitsController,
    OrganizationGroupsController,
    OrganizationOwnershipController,
  ],
  providers: [
    OrganizationUnitsService,
    OrganizationGroupsService,
    OrganizationOwnershipPolicyService,
    OwnershipTransferService,
  ],
  exports: [OrganizationOwnershipPolicyService],
})
export class OrganizationModule {}
