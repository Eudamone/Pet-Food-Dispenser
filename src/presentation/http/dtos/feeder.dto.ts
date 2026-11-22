import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import type {
  FeederDevice,
  GateState,
} from '../../../domain/entities/FeederDevice.js';
import type {
  DiscoveredFeeder,
  DiscoveredFeederSource,
} from '../services/device.service.js';

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

export class ClaimFeederDto {
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

export class DiscoveredFeederResponseDto {
  deviceId: string;
  source: DiscoveredFeederSource;
  lastSeenAt: Date | null;
  gateState: GateState;
  lastFault: string | null;

  static from(item: DiscoveredFeeder): DiscoveredFeederResponseDto {
    return {
      deviceId: item.deviceId,
      source: item.source,
      lastSeenAt: item.lastSeenAt,
      gateState: item.gateState,
      lastFault: item.lastFault,
    };
  }
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
      gateState: device.gateState,
      lastFault: device.lastFault,
      configurationPending: device.hasPendingConfiguration(),
    };
  }
}
