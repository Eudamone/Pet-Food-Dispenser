// device.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceRepository } from '@/repositories/device.repository.interface.js';
import { FeederDeviceOrmEntity } from '@/database/feeder-device.entity.js';
import { DispenseRequestOrmEntity } from '@/database/dispense-request.entity.js';
import { FeederDevice } from '@/models/feeder-device.model.js';
import { GateState } from '@/models/types.js';
import type { ConfigurationData } from '@/models/configuration.model.js';
import type { DispenseRequest } from '@/models/dispense-request.model.js';
import type { DeviceEvent } from '@/models/device-event.model.js';
import type { Id } from '@/models/types.js';

@Injectable()
export class TypeOrmDeviceRepository implements DeviceRepository {
  constructor(
    @InjectRepository(FeederDeviceOrmEntity)
    private readonly devices: Repository<FeederDeviceOrmEntity>,
    @InjectRepository(DispenseRequestOrmEntity)
    private readonly requests: Repository<DispenseRequestOrmEntity>,
  ) {}

  async findById(deviceId: Id): Promise<FeederDevice | null> {
    const entity = await this.devices.findOne({ where: { id: deviceId } });
    return entity ? this.toDomain(entity) : null;
  }

  async listByOwner(ownerId: Id): Promise<FeederDevice[]> {
    const entities = await this.devices.find({ where: { ownerId } });
    return entities.map((entity) => this.toDomain(entity));
  }

  async saveDevice(device: FeederDevice): Promise<void> {
    const existing = await this.devices.findOne({ where: { id: device.id } });
    const entity = existing ?? new FeederDeviceOrmEntity();
    entity.id = device.id;
    entity.ownerId = device.ownerId;
    entity.name = device.name;
    // Comedero ↔ mascota (1-1): la mascota autorizada se guarda en la columna
    // petId, así que saveDevice ya persiste el vínculo.
    const [petId] = [...device.authorizedPetIds];
    entity.petId = petId ?? null;
    entity.maxBowlGrams = device.maxBowlGrams;
    entity.desiredRevision = device.desiredRevision;
    entity.appliedRevision = device.appliedRevision;
    entity.lastSeenAt = device.lastSeenAt;
    entity.lastBowlGrams = device.lastBowlGrams;
    entity.gateState = device.gateState;
    entity.lastFault = device.lastFault;
    await this.devices.save(entity);
  }

  async listDeviceIdsForPet(petId: Id): Promise<Id[]> {
    const entities = await this.devices.find({
      where: { petId },
      select: { id: true },
    });
    return entities.map((entity) => entity.id);
  }

  async saveDesiredConfiguration(
    deviceId: Id,
    data: ConfigurationData,
    expectedRevision: number,
  ): Promise<number> {
    const entity = await this.devices.findOne({ where: { id: deviceId } });
    const revision = Math.max(expectedRevision, (entity?.desiredRevision ?? 0) + 1);
    await this.devices.update(
      { id: deviceId },
      { desiredConfiguration: { ...data, revision }, desiredRevision: revision },
    );
    return revision;
  }

  async getDesiredConfiguration(deviceId: Id): Promise<ConfigurationData | null> {
    const entity = await this.devices.findOne({ where: { id: deviceId } });
    return entity?.desiredConfiguration ?? null;
  }

  async getAppliedConfiguration(deviceId: Id): Promise<ConfigurationData | null> {
    const entity = await this.devices.findOne({ where: { id: deviceId } });
    return entity?.appliedConfiguration ?? null;
  }

  async saveRequest(data: DispenseRequest): Promise<void> {
    const entity = new DispenseRequestOrmEntity();
    entity.id = data.id;
    entity.deviceId = data.deviceId;
    entity.targetGrams = data.targetGrams;
    entity.requestedAt = data.requestedAt;
    entity.status = data.status;
    await this.requests.save(entity);
  }

  async findRequest(requestId: Id): Promise<DispenseRequest | null> {
    const entity = await this.requests.findOne({ where: { id: requestId } });
    if (!entity) {
      return null;
    }
    return {
      id: entity.id,
      deviceId: entity.deviceId,
      targetGrams: entity.targetGrams,
      requestedAt: entity.requestedAt,
      status: entity.status,
    };
  }

  async saveObservedState(deviceId: Id, event: DeviceEvent): Promise<void> {
    const entity = await this.devices.findOne({ where: { id: deviceId } });
    if (!entity) {
      return;
    }
    const payload = event.payload;
    const update: Partial<FeederDeviceOrmEntity> = {
      lastSeenAt: event.occurredAt,
      gateState: (payload.gate as GateState) ?? entity.gateState,
      lastFault: typeof payload.fault === 'string' ? payload.fault : null,
    };
    if (typeof payload.weight === 'number') {
      update.lastBowlGrams = payload.weight;
    }
    if (typeof payload.revision === 'number') {
      update.appliedRevision = payload.revision;
      update.appliedConfiguration = entity.desiredConfiguration;
    }
    await this.devices.update({ id: deviceId }, update);
  }

  private toDomain(entity: FeederDeviceOrmEntity): FeederDevice {
    return new FeederDevice(
      entity.id,
      entity.ownerId,
      entity.name,
      new Set(entity.petId ? [entity.petId] : []),
      entity.maxBowlGrams,
      entity.desiredRevision,
      entity.appliedRevision,
      entity.lastSeenAt,
      entity.lastBowlGrams,
      entity.gateState,
      entity.lastFault,
    );
  }
}
