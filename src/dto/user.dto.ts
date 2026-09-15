import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
