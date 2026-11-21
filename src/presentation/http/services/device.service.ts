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
import { isUUID } from 'class-validator';
import {
  FeederDevice,
  type GateState,
} from '../../../domain/entities/FeederDevice.js';
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

export type DiscoveredFeederSource = 'mqtt' | 'default';

export type DiscoveredFeeder = {
  readonly deviceId: string;
  readonly source: DiscoveredFeederSource;
  readonly lastSeenAt: Date | null;
  readonly lastBowlGrams: number | null;
  readonly gateState: GateState;
  readonly lastFault: string | null;
};

export type ClaimFeederOptions = {
  readonly deviceId?: string;
  readonly name?: string;
  readonly maxBowlGrams?: number;
};

const FALLBACK_FEEDER_NAME = 'Comedero Principal';
const FALLBACK_MAX_BOWL_GRAMS = 500;

@Injectable()
export class DeviceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceService.name);
  private readonly discovered = new Map<string, DiscoveredFeeder>();
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

  isMessengerConnected(): boolean {
    return this.messenger.connected;
  }

  async synchronize(deviceId: string, payload: unknown): Promise<void> {
    const normalizedId = deviceId.trim().toLowerCase();
    const event = readDeviceResult(normalizedId, payload);
    switch (event.kind) {
      case 'configurationApplied':
        await this.feeders.confirmPlan(normalizedId, event.revision);
        break;
      case 'observation':
        if (event.at.getTime() > Date.now() + 300000)
          throw new Error('Fecha del equipo adelantada.');
        if (await this.feeders.exists(normalizedId)) {
          this.discovered.delete(normalizedId);
          await this.feeders.saveObservedState(
            normalizedId,
            event.at,
            event.weight,
            event.gate,
            event.fault,
          );
        } else {
          this.recordDiscoveredObservation(
            normalizedId,
            event.at,
            event.weight,
            event.gate,
            event.fault,
          );
        }
        break;
      case 'access':
        await this.feeders.requireDevice(normalizedId);
        await this.feeding.saveAccess(event.record);
        break;
      case 'dispensing':
        await this.feeders.requireDevice(normalizedId);
        await this.feeding.saveDispensing(event.record);
        break;
    }
    this.messenger.confirmResults(normalizedId, [event.id]);
  }

  async listDiscovered(): Promise<DiscoveredFeeder[]> {
    const available: DiscoveredFeeder[] = [];
    for (const [id, entry] of this.discovered) {
      if (await this.feeders.exists(id)) {
        this.discovered.delete(id);
        continue;
      }
      available.push(entry);
    }

    available.sort((a, b) => {
      const timeA = a.lastSeenAt?.getTime() ?? 0;
      const timeB = b.lastSeenAt?.getTime() ?? 0;
      return timeB - timeA;
    });

    const defaultId = this.configuredDefaultFeederId();
    if (
      defaultId &&
      !this.discovered.has(defaultId) &&
      !(await this.feeders.exists(defaultId))
    ) {
      available.push({
        deviceId: defaultId,
        source: 'default',
        lastSeenAt: null,
        lastBowlGrams: null,
        gateState: 'unknown',
        lastFault: null,
      });
    }

    return available;
  }

  async claimAvailableFeeder(
    user: User,
    options?: ClaimFeederOptions,
  ): Promise<FeederDevice | null> {
    const name = options?.name?.trim() || this.defaultFeederName();
    const maxBowlGrams =
      options?.maxBowlGrams ?? this.defaultFeederMaxBowlGrams();

    if (options?.deviceId) {
      const targetId = options.deviceId.trim().toLowerCase();
      const existing = await this.feeders.findById(user.id, targetId);
      if (existing) return existing;
      return this.create(user, { deviceId: targetId, name, maxBowlGrams });
    }

    const owned = await this.feeders.listByOwner(user.id);
    if (owned.length > 0) return owned[0];

    const available = await this.listDiscovered();
    const candidate = available[0];
    if (!candidate) return null;

    try {
      return await this.create(user, {
        deviceId: candidate.deviceId,
        name,
        maxBowlGrams,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        this.discovered.delete(candidate.deviceId);
        return null;
      }
      throw error;
    }
  }

  async create(user: User, dto: CreateFeederDto): Promise<FeederDevice> {
    if (!(await this.users.findById(user.id))) {
      throw new NotFoundException('Primero debes completar tu perfil.');
    }
    const normalizedId = dto.deviceId.trim().toLowerCase();
    let device: FeederDevice;
    try {
      device = new FeederDevice(
        normalizedId,
        user.id,
        dto.name,
        dto.maxBowlGrams,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Datos de equipo inválidos.',
      );
    }
    const seen = this.discovered.get(normalizedId);
    if (seen?.lastSeenAt) {
      device.updateObservedState(
        seen.lastSeenAt,
        seen.lastBowlGrams,
        seen.gateState,
        seen.lastFault,
      );
    }
    const created = await this.feeders.create(device);
    this.discovered.delete(normalizedId);
    return created;
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
    const pet = await this.pets.findById(user.id, petId);
    if (!pet)
      throw new NotFoundException('No se encontró la mascota en tu cuenta.');
    return this.authorizeVerifiedPet(user, deviceId, petId);
  }

  async authorizeVerifiedPet(
    user: User,
    deviceId: string,
    petId: string,
  ): Promise<FeederDevice> {
    const device = await this.getDevice(user, deviceId);
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

  async autoAuthorizePet(
    user: User,
    petId: string,
    explicitFeederId?: string,
  ): Promise<FeederDevice | null> {
    if (explicitFeederId) {
      return this.authorizeVerifiedPet(
        user,
        explicitFeederId.trim().toLowerCase(),
        petId,
      );
    }
    const owned = await this.feeders.listByOwner(user.id);
    if (owned.length !== 1) return null;
    return this.authorizeVerifiedPet(user, owned[0].id, petId);
  }

  async syncConfigurationForPet(ownerId: string, petId: string): Promise<void> {
    const owned = await this.feeders.listByOwner(ownerId);
    for (const device of owned) {
      if (!device.isPetAuthorized(petId)) continue;
      device.markRequested(device.desiredRevision + 1);
      await this.feeders.saveDevice(device);
      this.notifyConfigurationChanged();
    }
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

  private recordDiscoveredObservation(
    deviceId: string,
    at: Date,
    weight: number | null,
    gate: GateState,
    fault: string | null,
  ): void {
    const previous = this.discovered.get(deviceId);
    if (previous?.lastSeenAt && at <= previous.lastSeenAt) return;
    if (!previous) {
      this.logger.log(`Alimentador no registrado detectado por MQTT: ${deviceId}`);
    }
    this.discovered.set(deviceId, {
      deviceId,
      source: 'mqtt',
      lastSeenAt: new Date(at),
      lastBowlGrams: weight,
      gateState: gate,
      lastFault: fault?.trim() || null,
    });
  }

  private configuredDefaultFeederId(): string | null {
    const raw = process.env.DEFAULT_FEEDER_ID?.trim();
    if (!raw || !isUUID(raw)) return null;
    return raw.toLowerCase();
  }

  private defaultFeederName(): string {
    return process.env.DEFAULT_FEEDER_NAME?.trim() || FALLBACK_FEEDER_NAME;
  }

  private defaultFeederMaxBowlGrams(): number {
    const parsed = Number(process.env.DEFAULT_FEEDER_MAX_BOWL_GRAMS);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : FALLBACK_MAX_BOWL_GRAMS;
  }
}
