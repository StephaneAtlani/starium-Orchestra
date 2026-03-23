import { Module } from '@nestjs/common';
import { SecurityLogsModule } from '../security-logs/security-logs.module';
import { MfaCryptoService } from './mfa-crypto.service';
import { MfaService } from './mfa.service';

@Module({
  imports: [SecurityLogsModule],
  providers: [MfaCryptoService, MfaService],
  exports: [MfaCryptoService, MfaService],
})
export class MfaModule {}
