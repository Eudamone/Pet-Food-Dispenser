import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { Pet } from '../../domain/Pet.js';

export class BirthDateDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  year?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number | null;
}

export class CreatePetDto {
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
}

export class UpdatePetDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/\S/)
  species?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @IsPositive()
  dailyLimitGrams?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => BirthDateDto)
  birth?: BirthDateDto;
}

export class SetDailyLimitDto {
  @IsNumber()
  @IsPositive()
  grams: number;
}

export class PetResponseDto {
  id: string;
  ownerId: string;
  name: string;
  species: string | null;
  dailyLimitGrams: number | null;
  birthYear: number | null;
  birthMonth: number | null;
  birthDay: number | null;

  static from(pet: Pet): PetResponseDto {
    return {
      id: pet.id,
      ownerId: pet.ownerId,
      name: pet.name,
      species: pet.species ?? null,
      dailyLimitGrams: pet.dailyLimitGrams ?? null,
      birthYear: pet.birthYear,
      birthMonth: pet.birthMonth,
      birthDay: pet.birthDay,
    };
  }
}
