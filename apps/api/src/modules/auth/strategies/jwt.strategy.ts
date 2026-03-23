import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { resolveJwtSecret } from '../auth-env.utils';

export interface JwtPayload {
  sub: string;
  platformRole?: string | null;
}

export interface JwtUser {
  userId: string;
  platformRole: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = resolveJwtSecret(config);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): JwtUser {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token invalide');
    }
    const platformRole: string | null = payload.platformRole ?? null;
    return { userId: payload.sub, platformRole };
  }
}
