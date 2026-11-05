import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeederDevice } from '../domain/FeederDevice.js';
import { FeederOrmEntity } from '../persistence/entities/feeder.entity.js';

@Injectable()
export class DeviceRepository {
  constructor(
    @InjectRepository(FeederOrmEntity)
    private readonly store: Repository<FeederOrmEntity>,
  ) {}

  async findById(ownerId: string, id: string): Promise<FeederDevice | null> {
    const row = await this.store.findOneBy({ ownerId, id });
    return row ? this.toDomain(row) : null;
  }

  async listByOwner(ownerId: string): Promise<FeederDevice[]> {
    return (
      await this.store.find({ where: { ownerId }, order: { name: 'ASC' } })
    ).map((row) => this.toDomain(row));
  }

  async create(device: FeederDevice): Promise<FeederDevice> {
    try {
      await this.store.insert({
        id: device.id,
        ownerId: device.ownerId,
        name: device.name,
        maxBowlGrams: device.maxBowlGrams,
        authorizedPetIds: [],
        desiredRevision: 0,
        appliedRevision: 0,
        gateState: 'unknown',
        lastSeenAt: null,
        lastBowlGrams: null,
        lastFault: null,
      });
      return device;
    } catch (error) {
      if (
        (error as { driverError?: { code?: string } }).driverError?.code ===
        '23505'
      ) {
        throw new ConflictException('El equipo ya está registrado.');
      }
      throw error;
    }
  }

  async save(device: FeederDevice): Promise<FeederDevice> {
    const result = await this.store.update(
      { id: device.id, ownerId: device.ownerId },
      { name: device.name },
    );
    if (!result.affected)
      throw new NotFoundException('No se encontró el equipo.');
    return (await this.findById(device.ownerId, device.id))!;
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const result = await this.store.delete({ ownerId, id });
    if (!result.affected)
      throw new NotFoundException('No se encontró el equipo.');
  }

  private toDomain(row: FeederOrmEntity): FeederDevice {
    const device = new FeederDevice(
      row.id,
      row.ownerId,
      row.name,
      row.maxBowlGrams,
    );
    for (const id of row.authorizedPetIds) device.addAuthorizedPet(id);
    if (row.desiredRevision > 0) device.markRequested(row.desiredRevision);
    device.confirmApplied(row.appliedRevision);
    if (row.lastSeenAt) {
      device.updateObservedState(
        row.lastSeenAt,
        row.lastBowlGrams,
        row.gateState,
        row.lastFault,
      );
    }
    return device;
  }
}
