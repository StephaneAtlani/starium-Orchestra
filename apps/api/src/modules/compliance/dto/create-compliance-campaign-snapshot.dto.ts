import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateComplianceCampaignSnapshotDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}
