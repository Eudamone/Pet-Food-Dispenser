// device.repository.interface.ts
import type { FeederDevice } from '@/models/feeder-device.model.js';
import type { ConfigurationData } from '@/models/configuration.model.js';
import type { DispenseRequest } from '@/models/dispense-request.model.js';
import type { DeviceEvent } from '@/models/device-event.model.js';
import type { Id } from '@/models/types.js';

export interface DeviceRepository {
  findById(deviceId: Id): Promise<FeederDevice | null>;
  listByOwner(ownerId: Id): Promise<FeederDevice[]>;
  saveDevice(device: FeederDevice): Promise<void>;
  saveAuthorizedPets(deviceId: Id, petIds: Set<Id>): Promise<void>;
  listDeviceIdsForPet(petId: Id): Promise<Id[]>;

  saveDesiredConfiguration(
    deviceId: Id,
    data: ConfigurationData,
    expectedRevision: number,
  ): Promise<number>;
  getDesiredConfiguration(deviceId: Id): Promise<ConfigurationData | null>;
  getAppliedConfiguration(deviceId: Id): Promise<ConfigurationData | null>;

  saveRequest(data: DispenseRequest): Promise<void>;
  findRequest(requestId: Id): Promise<DispenseRequest | null>;

  saveObservedState(deviceId: Id, event: DeviceEvent): Promise<void>;
}

export const DEVICE_REPOSITORY = Symbol('DeviceRepository');
