import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitProjectToCycleDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;
}
