import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RiskTaxonomyController } from './risk-taxonomy.controller';
import { RiskTaxonomyService } from './risk-taxonomy.service';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [RiskTaxonomyController],
  providers: [RiskTaxonomyService, ClientAdminGuard],
  exports: [RiskTaxonomyService],
})
export class RiskTaxonomyModule {}
