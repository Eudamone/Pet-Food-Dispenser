import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { FeederDevice } from '../../../domain/entities/FeederDevice.js';
import type { Pet } from '../../../domain/entities/Pet.js';
import type { RfidTag } from '../../../domain/entities/RfidTag.js';
import type { User } from '../../../domain/entities/User.js';
import { FeederResponseDto } from './feeder.dto.js';
import { BirthDateDto, PetResponseDto } from './pet.dto.js';
import { RfidTagResponseDto } from './rfid.dto.js';
import { UserResponseDto } from './user.dto.js';

export class OnboardingFeederDto {
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxBowlGrams?: number;
}

export class OnboardingPetDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/\S/)
  species?: string | null;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  dailyLimitGrams?: number | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => BirthDateDto)
  birth?: BirthDateDto;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  tagUid?: string;
}

export class OnboardingDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'El nombre no puede contener solo espacios.' })
  userName: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OnboardingFeederDto)
  feeder?: OnboardingFeederDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OnboardingPetDto)
  pet?: OnboardingPetDto;
}

export class OnboardingResponseDto {
  user: UserResponseDto;
  feeder: FeederResponseDto | null;
  pet: PetResponseDto | null;
  tag: RfidTagResponseDto | null;
  mqttDispatched: boolean;

  static from(result: {
    user: User;
    feeder: FeederDevice | null;
    pet: Pet | null;
    tag: RfidTag | null;
    mqttDispatched: boolean;
  }): OnboardingResponseDto {
    return {
      user: UserResponseDto.from(result.user),
      feeder: result.feeder ? FeederResponseDto.from(result.feeder) : null,
      pet: result.pet ? PetResponseDto.from(result.pet) : null,
      tag: result.tag ? RfidTagResponseDto.from(result.tag) : null,
      mqttDispatched: result.mqttDispatched,
    };
  }
}
