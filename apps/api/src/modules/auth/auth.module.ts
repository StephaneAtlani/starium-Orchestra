import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION,
  parseExpiration,
} from './auth.constants';
import { resolveJwtSecret } from './auth-env.utils';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SecurityLogsService } from '../security-logs/security-logs.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MfaModule } from '../mfa/mfa.module';
import { TrustedDeviceService } from './trusted-device.service';
import { MicrosoftSsoController } from './microsoft-sso/microsoft-sso.controller';
import { MicrosoftSsoService } from './microsoft-sso/microsoft-sso.service';
import { MicrosoftIdTokenService } from '../microsoft/microsoft-id-token.service';
import { MicrosoftTokenHttpService } from '../microsoft/microsoft-token-http.service';
import { MicrosoftTokenCryptoService } from '../microsoft/microsoft-token-crypto.service';
import { MicrosoftPlatformConfigService } from '../microsoft/microsoft-platform-config.service';

@Module({
  imports: [
    MfaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = resolveJwtSecret(config);
        const expiresIn = parseExpiration(
          config.get<string | number>('JWT_ACCESS_EXPIRATION'),
          900,
        );
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, MicrosoftSsoController],
  providers: [
    AuthService,
    MicrosoftSsoService,
    MicrosoftIdTokenService,
    MicrosoftTokenHttpService,
    MicrosoftTokenCryptoService,
    MicrosoftPlatformConfigService,
    TrustedDeviceService,
    JwtStrategy,
    JwtAuthGuard,
    SecurityLogsService,
    {
      provide: JWT_ACCESS_EXPIRATION,
      useFactory: (config: ConfigService) =>
        parseExpiration(config.get<string | number>('JWT_ACCESS_EXPIRATION'), 900),
      inject: [ConfigService],
    },
    {
      provide: JWT_REFRESH_EXPIRATION,
      useFactory: (config: ConfigService) =>
        parseExpiration(config.get<string | number>('JWT_REFRESH_EXPIRATION'), 604800),
      inject: [ConfigService],
    },
  ],
  exports: [JwtAuthGuard, JwtModule, MfaModule],
})
export class AuthModule {}
