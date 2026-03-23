import { ConfigService } from '@nestjs/config';

const JWT_SECRET_KEYS = ['JWT_SECRET', 'AUTH_JWT_SECRET', 'NEST_JWT_SECRET'] as const;

export function resolveJwtSecret(config: ConfigService): string {
  for (const key of JWT_SECRET_KEYS) {
    const value = config.get<string>(key)?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(
    `JWT secret must be set in one of: ${JWT_SECRET_KEYS.join(', ')}`,
  );
}
