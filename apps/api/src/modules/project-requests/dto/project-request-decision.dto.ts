import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectRequestDecisionDto {
  @IsIn(['APPROVED', 'REJECTED', 'NEEDS_MORE_INFO'])
  outcome!: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;
}
