import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  IsNumber,
  IsPositive,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  SERVO_POSITIONS,
  SERVOS,
  type ServoPosition,
  type ServoName,
} from '../../../domain/ports/device-messenger.port.js';
import {
  MAX_DOSE_SECONDS,
  MAX_MANUAL_OPEN_SECONDS,
} from '../../../domain/entities/dose-target.js';

class FeedingSlotDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  id?: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days: number[];

  @ValidateIf((_, value) => value != null)
  @IsNumber()
  @IsPositive()
  targetGrams?: number | null;

  @ValidateIf((_, value) => value != null)
  @IsInt()
  @Min(1)
  @Max(MAX_DOSE_SECONDS)
  durationSeconds?: number | null;

  @IsBoolean()
  enabled: boolean;
}

export class SaveFeedingPlanDto {
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedRevision: number;

  @ValidateIf((_, value) => value != null)
  @IsNumber()
  @IsPositive()
  maxDailyDispensedGrams?: number | null;

  @ValidateIf((_, value) => value != null)
  @IsInt()
  @Min(1)
  @Max(MAX_MANUAL_OPEN_SECONDS)
  maxDailyOpenSeconds?: number | null;

  @IsBoolean()
  enabled: boolean;

  @IsArray()
  @ArrayMaxSize(16, { message: 'El alimentador admite hasta 16 horarios.' })
  @ValidateNested({ each: true })
  @Type(() => FeedingSlotDto)
  slots: FeedingSlotDto[];
}

export class ManualDispenseDto {
  @ValidateIf((_, value) => value != null)
  @IsNumber()
  @IsPositive()
  targetGrams?: number | null;

  @ValidateIf((_, value) => value != null)
  @IsInt()
  @Min(1)
  @Max(MAX_DOSE_SECONDS)
  durationSeconds?: number | null;

  @ValidateIf((_, value) => value !== undefined)
  @Matches(/^[A-Za-z0-9:_-]{1,120}$/)
  requestId?: string;
}

export class ServoCommandDto {
  @IsIn(SERVOS)
  servo: ServoName;

  @IsIn(SERVO_POSITIONS)
  position: ServoPosition;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(MAX_MANUAL_OPEN_SECONDS)
  openForSeconds?: number;
}
