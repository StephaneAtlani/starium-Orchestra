import { IsString, Length, Matches } from 'class-validator';

/** POST /api/auth/microsoft/complete — échange du code handoff opaque contre les jetons session. */
export class MicrosoftSsoCompleteDto {
  @IsString()
  @Length(32, 128)
  @Matches(/^[a-f0-9]+$/i)
  handoff!: string;
}
