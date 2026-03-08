import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(ClientUserRole)
  @IsOptional()
  role?: ClientUserRole;

  @IsEnum(ClientUserStatus)
  @IsOptional()
  status?: ClientUserStatus;
}
