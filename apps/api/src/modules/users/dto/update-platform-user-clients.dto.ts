import { ClientUserRole } from '@prisma/client';
import { IsArray, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PlatformUserClientAssignmentDto {
  @IsString()
  clientId!: string;

  @IsEnum(ClientUserRole)
  role!: ClientUserRole;
}

export class UpdatePlatformUserClientsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformUserClientAssignmentDto)
  assignments!: PlatformUserClientAssignmentDto[];
}

