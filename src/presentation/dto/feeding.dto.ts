import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsPositive,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

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

  @IsNumber()
  @IsPositive()
  targetGrams: number;

  @IsBoolean()
  enabled: boolean;
}

export class SaveFeedingPlanDto {
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedRevision: number;

  @IsNumber()
  @IsPositive()
  maxDailyDispensedGrams: number;

  @IsBoolean()
  enabled: boolean;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FeedingSlotDto)
  slots: FeedingSlotDto[];
}
