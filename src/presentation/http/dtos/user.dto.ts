import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import type { FeederDevice } from '../../../domain/entities/FeederDevice.js';
import type { User } from '../../../domain/entities/User.js';
import { FeederResponseDto } from './feeder.dto.js';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'El nombre no puede contener solo espacios.' })
  name: string;

  @IsOptional()
  @IsBoolean()
  autoLinkFeeder?: boolean;

  @IsOptional()
  @IsUUID()
  feederId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  feederName?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxBowlGrams?: number;
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

export class CreateUserResponseDto extends UserResponseDto {
  linkedFeeder: FeederResponseDto | null;

  static fromSetup(
    user: User,
    linkedFeeder: FeederDevice | null,
  ): CreateUserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      linkedFeeder: linkedFeeder ? FeederResponseDto.from(linkedFeeder) : null,
    };
  }
}
