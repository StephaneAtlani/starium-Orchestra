import { IsString } from 'class-validator';

export class RunDirectorySyncDto {
  @IsString()
  connectionId!: string;
}
