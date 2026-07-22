import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MfaModule } from '../../modules/mfa/mfa.module';
import { EmailReservationService } from './email-reservation.service';
import { SensitiveOperationPolicyService } from './sensitive-operation-policy.service';

@Global()
@Module({
  imports: [PrismaModule, MfaModule],
  providers: [EmailReservationService, SensitiveOperationPolicyService],
  exports: [EmailReservationService, SensitiveOperationPolicyService],
})
export class AuthCommonModule {}
