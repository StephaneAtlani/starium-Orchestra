import { IsString, MinLength } from 'class-validator';

export class SetDefaultEmailIdentityDto {
  @IsString()
  @MinLength(1)
  emailIdentityId!: string;
}
