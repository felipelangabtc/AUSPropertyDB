import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestMagicLinkDto {
  @IsEmail()
  email: string;
}

export class VerifyMagicLinkDto {
  @IsNotEmpty()
  token: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;
}
