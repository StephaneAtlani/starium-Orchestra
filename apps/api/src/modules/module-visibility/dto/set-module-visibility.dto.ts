import { ModuleVisibilityScopeType, ModuleVisibilityState } from '@prisma/client';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class SetModuleVisibilityDto {
  @IsString()
  moduleCode!: string;

  @IsEnum(ModuleVisibilityScopeType)
  scopeType!: ModuleVisibilityScopeType;

  @ValidateIf((o: SetModuleVisibilityDto) => o.scopeType !== ModuleVisibilityScopeType.CLIENT)
  @IsString()
  scopeId?: string;

  @IsEnum(ModuleVisibilityState)
  visibility!: ModuleVisibilityState;
}

export class RemoveModuleVisibilityQueryDto {
  @IsString()
  moduleCode!: string;

  @IsEnum(ModuleVisibilityScopeType)
  scopeType!: ModuleVisibilityScopeType;

  @ValidateIf((o: RemoveModuleVisibilityQueryDto) => o.scopeType !== ModuleVisibilityScopeType.CLIENT)
  @IsOptional()
  @IsString()
  scopeId?: string;
}
