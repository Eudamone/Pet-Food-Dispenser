// pet.dto.ts
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PartialDate } from '@/helpers/partial-date.vo.js';

export class RegisterPetDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  species?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  birthYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  birthMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  birthDay?: number;

  toBirthDate(): PartialDate {
    return PartialDate.create(this.birthYear, this.birthMonth, this.birthDay);
  }
}

export class UpdatePetDto extends RegisterPetDto {}

export class SetDailyLimitDto {
  @IsNumber()
  @IsPositive()
  grams: number;
}

export class RegisterTagDto {
  @IsString()
  @IsNotEmpty()
  uid: string;
}

export class AssignTagDto {
  @IsString()
  @IsNotEmpty()
  uid: string;
}
