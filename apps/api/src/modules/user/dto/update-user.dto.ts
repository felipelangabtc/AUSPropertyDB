import { IsEmail, IsOptional, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  avatar?: string;

  @IsOptional()
  preferences?: Record<string, any>;
}
