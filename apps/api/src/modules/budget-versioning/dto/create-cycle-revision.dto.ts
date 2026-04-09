import { IsIn } from 'class-validator';

export class CreateCycleRevisionDto {
  @IsIn(['T1', 'T2'])
  phase!: 'T1' | 'T2';
}
