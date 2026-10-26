// feeding.dto.ts
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Matches,
} from 'class-validator';
import { Day } from '@/helpers/local-date.vo.js';

export class CreatePlanDto {
  @IsNumber()
  @IsPositive()
  maxDailyDispensedGrams: number;
}

export class SaveSlotDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'time must use the HH:mm format' })
  time: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Day, { each: true })
  days: Day[];

  @IsNumber()
  @IsPositive()
  targetGrams: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class SetMaxDailyDto {
  @IsNumber()
  @IsPositive()
  grams: number;
}

export class SetPlanEnabledDto {
  @IsBoolean()
  enabled: boolean;
}

export class HistoryQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ConsumptionQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'day must use the YYYY-MM-DD format' })
  day?: string;
}
