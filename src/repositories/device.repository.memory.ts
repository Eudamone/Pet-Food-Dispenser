// device.repository.memory.ts
import { Injectable, Optional } from '@nestjs/common';
import { DeviceRepository } from '@/repositories/device.repository.interface.js';
import { InMemoryStorageClient } from '@/repositories/storage.client.js';
import type { StorageClient } from '@/repositories/storage.client.js';
import { FeederDevice } from '@/models/feeder-device.model.js';
import { GateState } from '@/models/types.js';
import type { ConfigurationData } from '@/models/configuration.model.js';
import type { DispenseRequest } from '@/models/dispense-request.model.js';
import type { DeviceEvent } from '@/models/device-event.model.js';
import type { Id } from '@/models/types.js';

const DEVICES = 'devices';
const REQUESTS = 'dispense-requests';

@Injectable()
export class InMemoryDeviceRepository implements DeviceRepository {
  private readonly store: StorageClient;
  private readonly desired = new Map<Id, ConfigurationData>();
  private readonly applied = new Map<Id, ConfigurationData>();

  constructor(@Optional() store: StorageClient = new InMemoryStorageClient()) {
    this.store = store;
  }

  async findById(deviceId: Id): Promise<FeederDevice | null> {
    return this.store.get<FeederDevice>(DEVICES, deviceId);
  }

  async listByOwner(ownerId: Id): Promise<FeederDevice[]> {
    const devices = await this.store.list<FeederDevice>(DEVICES);
    return devices.filter((device) => device.ownerId === ownerId);
  }

  async saveDevice(device: FeederDevice): Promise<void> {
    await this.store.set<FeederDevice>(DEVICES, device.id, device);
  }

  async listDeviceIdsForPet(petId: Id): Promise<Id[]> {
    const devices = await this.store.list<FeederDevice>(DEVICES);
    return devices
      .filter((device) => device.isPetAuthorized(petId))
      .map((device) => device.id);
  }

  async saveDesiredConfiguration(
    deviceId: Id,
    data: ConfigurationData,
    expectedRevision: number,
  ): Promise<number> {
    const revision = Math.max(expectedRevision, (this.desired.get(deviceId)?.revision ?? 0) + 1);
    this.desired.set(deviceId, { ...data, revision });
    const device = await this.findById(deviceId);
    if (device) {
      device.markRequested(revision);
      await this.saveDevice(device);
    }
    return revision;
  }

  async getDesiredConfiguration(deviceId: Id): Promise<ConfigurationData | null> {
    return this.desired.get(deviceId) ?? null;
  }

  async getAppliedConfiguration(deviceId: Id): Promise<ConfigurationData | null> {
    return this.applied.get(deviceId) ?? null;
  }

  async saveRequest(data: DispenseRequest): Promise<void> {
    await this.store.set<DispenseRequest>(REQUESTS, data.id, data);
  }

  async findRequest(requestId: Id): Promise<DispenseRequest | null> {
    return this.store.get<DispenseRequest>(REQUESTS, requestId);
  }

  async saveObservedState(deviceId: Id, event: DeviceEvent): Promise<void> {
    const device = await this.findById(deviceId);
    if (!device) {
      return;
    }
    const payload = event.payload;
    device.updateObservedState(
      event.occurredAt,
      typeof payload.weight === 'number' ? payload.weight : null,
      (payload.gate as GateState) ?? device.gateState,
      typeof payload.fault === 'string' ? payload.fault : null,
    );
    if (typeof payload.revision === 'number') {
      device.confirmApplied(payload.revision);
      this.applied.set(
        deviceId,
        this.desired.get(deviceId) ?? this.applied.get(deviceId) ?? ({} as ConfigurationData),
      );
    }
    await this.saveDevice(device);
  }
}
