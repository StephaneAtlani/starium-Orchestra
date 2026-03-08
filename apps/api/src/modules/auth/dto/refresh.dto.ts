import { IsNotEmpty, IsString } from 'class-validator';

/** Payload POST /auth/refresh et POST /auth/logout — refreshToken. */
export class RefreshDto {
  @IsString()
  @IsNotEmpty({ message: 'Le refresh token est requis' })
  refreshToken!: string;
}
