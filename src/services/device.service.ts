import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeederDevice } from '../domain/FeederDevice.js';
import type { User } from '../domain/User.js';
import type {
  CreateFeederDto,
  UpdateFeederDto,
} from '../presentation/dto/feeder.dto.js';
import { DeviceRepository } from '../repositories/device.repository.js';
import { UserRepository } from '../repositories/user.repository.js';

@Injectable()
export class DeviceService {
  constructor(
    private readonly feeders: DeviceRepository,
    private readonly users: UserRepository,
  ) {}

  async create(user: User, dto: CreateFeederDto): Promise<FeederDevice> {
    if (!(await this.users.findById(user.id))) {
      throw new NotFoundException('Primero debes completar tu perfil.');
    }
    let device: FeederDevice;
    try {
      device = new FeederDevice(
        dto.deviceId,
        user.id,
        dto.name,
        dto.maxBowlGrams,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Datos de equipo inválidos.',
      );
    }
    return this.feeders.create(device);
  }

  findAll(user: User): Promise<FeederDevice[]> {
    return this.feeders.listByOwner(user.id);
  }

  async findOne(user: User, id: string): Promise<FeederDevice> {
    const device = await this.feeders.findById(user.id, id);
    if (!device)
      throw new NotFoundException('No se encontró el equipo en tu cuenta.');
    return device;
  }

  async update(
    user: User,
    id: string,
    dto: UpdateFeederDto,
  ): Promise<FeederDevice> {
    const device = await this.findOne(user, id);
    if (dto.name !== undefined) device.rename(dto.name);
    return this.feeders.save(device);
  }

  async delete(user: User, id: string): Promise<void> {
    await this.findOne(user, id);
    await this.feeders.delete(user.id, id);
  }
}
