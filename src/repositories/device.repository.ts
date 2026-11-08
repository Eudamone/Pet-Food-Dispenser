import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeederDevice } from '../domain/FeederDevice.js';

@Injectable()
export class DeviceRepository {
  constructor(
    @InjectRepository(FeederDevice)
    private readonly store: Repository<FeederDevice>,
  ) {}

  async findById(ownerId: string, id: string): Promise<FeederDevice | null> {
    const row = await this.store.findOneBy({ ownerId, id });
    return row;
  }

  async listByOwner(ownerId: string): Promise<FeederDevice[]> {
    return this.store.find({ where: { ownerId }, order: { name: 'ASC' } });
  }

  async create(device: FeederDevice): Promise<FeederDevice> {
    try {
      await this.store.insert(device);
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

  async saveDevice(device: FeederDevice): Promise<FeederDevice> {
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
}
