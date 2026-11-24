import type { LocalCredentials } from '../../../domain/repositories/user.repository.js';
import type { AccessSession } from '../../../domain/entities/AccessSession.js';
import type { DispensingRecord } from '../../../domain/entities/DispensingRecord.js';
import type { FeederDevice } from '../../../domain/entities/FeederDevice.js';
import type { FeedingPlan } from '../../../domain/entities/FeedingPlan.js';
import type { Pet } from '../../../domain/entities/Pet.js';
import type { RfidTag } from '../../../domain/entities/RfidTag.js';
import type { User } from '../../../domain/entities/User.js';

export class MemoryDatabase {
  readonly credentials = new Map<string, LocalCredentials>();
  readonly users = new Map<string, User>();
  readonly pets = new Map<string, Pet>();
  readonly tags = new Map<string, RfidTag>();
  readonly devices = new Map<string, FeederDevice>();
  readonly plans = new Map<string, FeedingPlan>();
  readonly access = new Map<string, AccessSession>();
  readonly dispensing = new Map<string, DispensingRecord>();

  petKey(ownerId: string, petId: string): string {
    return `${ownerId}:${petId}`;
  }

  recordKey(id: string, deviceId: string): string {
    return `${id}:${deviceId}`;
  }
}
