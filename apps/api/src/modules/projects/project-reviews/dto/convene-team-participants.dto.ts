import { IsString, MinLength } from 'class-validator';

export class ConveneTeamParticipantsDto {
  @IsString()
  @MinLength(1)
  teamId!: string;
}
