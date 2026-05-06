import { IsNotEmpty, IsString } from 'class-validator';

export class AddAccessGroupMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
