import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeSheetDto {
  @IsString()
  @IsNotEmpty()
  fileToken!: string;

  @IsString()
  @IsNotEmpty()
  sheetName!: string;
}
