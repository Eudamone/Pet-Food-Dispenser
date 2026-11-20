import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';
import type { RfidTag } from '../../domain/RfidTag.js';

export class RegisterTagDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  uid: string;
}

export class AssignTagDto {
  @IsUUID()
  petId: string;
}

export class RfidTagResponseDto {
  uid: string;
  ownerId: string;
  petId: string | null;
  active: boolean;

  static from(tag: RfidTag): RfidTagResponseDto {
    return {
      uid: tag.uid,
      ownerId: tag.ownerId,
      petId: tag.petId,
      active: tag.active,
    };
  }
}
