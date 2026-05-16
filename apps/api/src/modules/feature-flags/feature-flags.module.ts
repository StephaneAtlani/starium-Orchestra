import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FeatureFlagsService } from './feature-flags.service';

/** RFC-ACL-022 / RFC-ACL-024 — global, Prisma seul (pas de CommonModule → pas de cycle DI). */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
