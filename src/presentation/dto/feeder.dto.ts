import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import type { FeederDevice, GateState } from '../../domain/FeederDevice.js';

export class CreateFeederDto {
  @IsUUID()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name: string;

  @IsNumber()
  @IsPositive()
  maxBowlGrams: number;
}

export class UpdateFeederDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name?: string;
}

export class FeederResponseDto {
  id: string;
  ownerId: string;
  name: string;
  maxBowlGrams: number;
  authorizedPetIds: string[];
  desiredRevision: number;
  appliedRevision: number;
  lastSeenAt: Date | null;
  lastBowlGrams: number | null;
  gateState: GateState;
  lastFault: string | null;
  configurationPending: boolean;

  static from(device: FeederDevice): FeederResponseDto {
    return {
      id: device.id,
      ownerId: device.ownerId,
      name: device.name,
      maxBowlGrams: device.maxBowlGrams,
      authorizedPetIds: [...device.authorizedPetIds],
      desiredRevision: device.desiredRevision,
      appliedRevision: device.appliedRevision,
      lastSeenAt: device.lastSeenAt,
      lastBowlGrams: device.lastBowlGrams,
      gateState: device.gateState,
      lastFault: device.lastFault,
      configurationPending: device.hasPendingConfiguration(),
    };
  }
}
