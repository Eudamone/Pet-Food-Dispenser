// auth.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class SignInDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class EmailChangeDto {
  @IsEmail()
  newEmail: string;
}

export class PasswordResetDto {
  @IsEmail()
  email: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  newPassword: string;
}
