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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET must be set');
        }
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
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
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
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
