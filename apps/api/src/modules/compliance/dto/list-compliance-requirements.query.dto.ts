import { IsOptional, IsString } from 'class-validator';

export class ListComplianceRequirementsQueryDto {
  @IsOptional()
  @IsString()
  frameworkId?: string;
}
