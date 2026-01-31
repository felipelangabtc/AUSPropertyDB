import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class AuthSignupDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsOptional()
  @MinLength(8)
  password?: string;
}
