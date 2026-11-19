import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FeederDevice } from '../../../domain/entities/FeederDevice.js';
import type { User } from '../../../domain/entities/User.js';
import type { CreateFeederDto, UpdateFeederDto } from '../dtos/feeder.dto.js';
import {
  DEVICE_REPOSITORY,
  type DeviceRepository,
} from '../../../domain/repositories/device.repository.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository.js';
import {
  PET_REPOSITORY,
  type PetRepository,
} from '../../../domain/repositories/pet.repository.js';
import {
  FEEDING_REPOSITORY,
  type FeedingRepository,
} from '../../../domain/repositories/feeding.repository.js';
import {
  DEVICE_MESSENGER,
  type DeviceMessenger,
} from '../../../domain/ports/device-messenger.port.js';
import { readDeviceResult } from './device-result.js';

@Injectable()
export class DeviceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceService.name);
  private timer?: ReturnType<typeof setInterval>;
  private sending = false;

  constructor(
    @Inject(DEVICE_REPOSITORY) private readonly feeders: DeviceRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PET_REPOSITORY) private readonly pets: PetRepository,
    @Inject(FEEDING_REPOSITORY) private readonly feeding: FeedingRepository,
    @Inject(DEVICE_MESSENGER) private readonly messenger: DeviceMessenger,
  ) {}

  onModuleInit(): void {
    if (process.env.MQTT_URL) {
      this.timer = setInterval(() => {
        void this.sendPendingPlans();
      }, 5000).unref();
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  notifyConfigurationChanged(): void {
    void this.sendPendingPlans();
  }

  private async sendPendingPlans(): Promise<void> {
    if (!this.messenger.connected || this.sending) return;
    this.sending = true;
    try {
      for (const plan of await this.feeders.pendingPlans())
        this.messenger.sendConfiguration(plan.deviceId, {
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
    this.messenger.confirmResults(deviceId, [event.id]);
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

  async authorizePet(
    user: User,
    deviceId: string,
    petId: string,
  ): Promise<FeederDevice> {
    const device = await this.getDevice(user, deviceId);
    const pet = await this.pets.findById(user.id, petId);
    if (!pet)
      throw new NotFoundException('No se encontró la mascota en tu cuenta.');

    const allDevices = await this.feeders.listByOwner(user.id);
    for (const other of allDevices) {
      if (other.id !== device.id && other.isPetAuthorized(petId)) {
        throw new ConflictException(
          'La mascota ya está autorizada en otro alimentador.',
        );
      }
    }

    if (device.addAuthorizedPet(petId)) {
      device.markRequested(device.desiredRevision + 1);
      const saved = await this.feeders.saveDevice(device);
      this.notifyConfigurationChanged();
      return saved;
    }
    return device;
  }

  async revokePet(
    user: User,
    deviceId: string,
    petId: string,
  ): Promise<FeederDevice> {
    const device = await this.getDevice(user, deviceId);
    if (device.removeAuthorizedPet(petId)) {
      device.markRequested(device.desiredRevision + 1);
      const saved = await this.feeders.saveDevice(device);
      this.notifyConfigurationChanged();
      return saved;
    }
    return device;
  }

  async requestManualDispense(
    user: User,
    deviceId: string,
    targetGrams: number,
    requestId?: string,
  ) {
    const device = await this.getDevice(user, deviceId);
    if (
      !Number.isFinite(targetGrams) ||
      targetGrams <= 0 ||
      targetGrams > device.maxBowlGrams
    ) {
      throw new BadRequestException(
        `El objetivo manual debe estar entre 1 y ${device.maxBowlGrams} gramos.`,
      );
    }
    const id = requestId?.trim() || randomUUID();
    const requestedAt = new Date().toISOString();
    this.messenger.sendManualDispense?.(device.id, {
      kind: 'manualDispense',
      requestId: id,
      deviceId: device.id,
      targetGrams,
      requestedAt,
    });
    return {
      requestId: id,
      deviceId: device.id,
      targetGrams,
      requestedAt,
      status: 'pending' as const,
      dispatched: this.messenger.connected,
    };
  }
}
