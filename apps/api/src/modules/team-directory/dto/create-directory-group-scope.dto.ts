import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDirectoryGroupScopeDto {
  @IsString()
  @MaxLength(200)
  groupId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  groupName?: string;
}
