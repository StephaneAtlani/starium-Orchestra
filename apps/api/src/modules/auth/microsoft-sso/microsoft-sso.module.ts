import { Module } from '@nestjs/common';
import { MicrosoftSsoController } from './microsoft-sso.controller';
import { MicrosoftSsoService } from './microsoft-sso.service';

@Module({
  controllers: [MicrosoftSsoController],
  providers: [MicrosoftSsoService],
})
export class MicrosoftSsoModule {}
