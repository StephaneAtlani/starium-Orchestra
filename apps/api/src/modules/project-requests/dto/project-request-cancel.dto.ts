import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectRequestCancelDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;
}
