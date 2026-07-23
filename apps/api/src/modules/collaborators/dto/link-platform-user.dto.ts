import { IsNotEmpty, IsString, Matches } from 'class-validator';

/** Prisma `@default(cuid())` — pas UUID. */
const CUID_PATTERN = /^c[a-z0-9]{24}$/i;

export class LinkPlatformUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(CUID_PATTERN, { message: 'userId must be a cuid' })
  userId!: string;
}
