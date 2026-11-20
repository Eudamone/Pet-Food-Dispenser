import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { FeederDevice } from '../domain/FeederDevice.js';
import type { User } from '../domain/User.js';
import type {
  CreateFeederDto,
  UpdateFeederDto,
} from '../presentation/dto/feeder.dto.js';
import { DeviceRepository } from '../repositories/device.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { FeedingRepository } from '../repositories/feeding.repository.js';
import { DeviceConnection } from './device-connection.js';
import { readDeviceResult } from './device-result.js';

@Injectable()
export class DeviceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceService.name);
  private timer?: ReturnType<typeof setInterval>;
  private sending = false;

  constructor(
    private readonly feeders: DeviceRepository,
    private readonly users: UserRepository,
    private readonly feeding: FeedingRepository,
    private readonly connection: DeviceConnection,
  ) {}

  onModuleInit(): void {
    this.connection.readResults((id, payload) => this.synchronize(id, payload));
    if (process.env.MQTT_URL) {
      this.timer = setInterval(() => {
        void this.sendPendingPlans();
      }, 5000).unref();
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  private async sendPendingPlans(): Promise<void> {
    if (!this.connection.connected || this.sending) return;
    this.sending = true;
    try {
      for (const plan of await this.feeders.pendingPlans())
        this.connection.sendConfiguration(plan.deviceId, {
          kind: 'feedingPlan',
          ...plan,
        });
    } catch (error) {
      this.logger.warn(
        error instanceof Error
          ? error.message
          : 'No se enviaron los planes pendientes.',
      );
    } finally {
      this.sending = false;
    }
  }

  async synchronize(deviceId: string, payload: unknown): Promise<void> {
    const event = readDeviceResult(deviceId, payload);
    switch (event.kind) {
      case 'configurationApplied':
        await this.feeders.confirmPlan(deviceId, event.revision);
        break;
      case 'observation':
        if (event.at.getTime() > Date.now() + 300000)
          throw new Error('Fecha del equipo adelantada.');
        await this.feeders.saveObservedState(
          deviceId,
          event.at,
          event.weight,
          event.gate,
          event.fault,
        );
        break;
      case 'access':
        await this.feeders.requireDevice(deviceId);
        await this.feeding.saveAccess(event.record);
        break;
      case 'dispensing':
        await this.feeders.requireDevice(deviceId);
        await this.feeding.saveDispensing(event.record);
        break;
    }
    this.connection.confirmResults(deviceId, [event.id]);
  }

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

  async getDevice(user: User, id: string): Promise<FeederDevice> {
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
    const device = await this.getDevice(user, id);
    if (dto.name !== undefined) device.rename(dto.name);
    return this.feeders.saveDevice(device);
  }

  async delete(user: User, id: string): Promise<void> {
    await this.getDevice(user, id);
    await this.feeders.delete(user.id, id);
  }
}
