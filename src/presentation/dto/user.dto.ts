import { IsNotEmpty, IsString, Matches, ValidateIf } from 'class-validator';
import type { User } from '../../domain/User.js';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'El nombre no puede contener solo espacios.' })
  name: string;
}

export class UpdateUserDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name?: string;
}

export class UserResponseDto {
  id: string;
  name: string;
  email: string;

  static from(user: User): UserResponseDto {
    return { id: user.id, name: user.name, email: user.email };
  }
}
