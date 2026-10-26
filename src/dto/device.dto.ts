// device.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  bindingCode: string;
}

export class RequestDispenseDto {
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @IsNumber()
  @IsPositive()
  targetGrams: number;
}
