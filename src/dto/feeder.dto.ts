import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateFeederDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsUUID()
  petId?: string;
}

export class UpdateFeederDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  petId?: string | null;
}
