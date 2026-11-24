import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
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
  type ManualDispenseCommand,
  type ServoCommand,
} from '../../../domain/ports/device-messenger.port.js';
import type { ServoCommandDto } from '../dtos/feeding.dto.js';
import { readDeviceResult } from './device-result.js';

export type DiscoveredFeederSource = 'mqtt' | 'default';

export type DiscoveredFeeder = {
  readonly deviceId: string;
  readonly source: DiscoveredFeederSource;
  readonly lastSeenAt: Date | null;
  readonly gateState: GateState;
  readonly lastFault: string | null;
};

export type ClaimFeederOptions = {
  readonly deviceId?: string;
  readonly name?: string;
  readonly maxBowlGrams?: number;
};

export type ScannedRfidTag = {
  readonly tagUid: string;
  readonly scannedAt: Date;
  readonly alreadyRegistered: boolean;
  readonly assignedPetId: string | null;
};

type ScannedRfidEntry = {
  readonly tagUid: string;
  readonly scannedAt: Date;
  readonly receivedAtMs: number;
};

const FALLBACK_FEEDER_NAME = 'Comedero Principal';
const FALLBACK_MAX_BOWL_GRAMS = 500;
const SCANNED_RFID_TTL_MS = 60_000;
const MAX_SCANNED_TAGS_PER_DEVICE = 5;
const MANUAL_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MANUAL_REQUESTS = 1000;
const SERVO_REQUEST_TTL_MS = 60_000;

type ServoRequest = ServoCommand & {
  status: 'pending' | 'applied' | 'rejected';
  reason: string | null;
};

@Injectable()
export class DeviceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceService.name);
  private readonly discovered = new Map<string, DiscoveredFeeder>();
  private readonly scannedTags = new Map<
    string,
    Map<string, ScannedRfidEntry>
  >();
  private timer?: ReturnType<typeof setInterval>;
  private sending = false;
  private readonly manualRequests = new Map<string, ManualDispenseCommand>();
  private readonly servoRequests = new Map<string, ServoRequest>();

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
          sentAt: new Date().toISOString(),
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
      case 'servoResult': {
        const request = this.servoRequests.get(event.id);
        if (request?.deviceId === normalizedId && request.status === 'pending') {
          request.status = event.applied ? 'applied' : 'rejected';
          request.reason = event.reason;
        }
        break;
      }
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
            event.gate,
            event.fault,
          );
        } else {
          this.recordDiscoveredObservation(
            normalizedId,
            event.at,
            event.gate,
            event.fault,
          );
        }
        break;
      case 'rfidScanned':
        if (event.at.getTime() > Date.now() + 300000)
          throw new Error('Fecha del equipo adelantada.');
        this.recordScannedTag(normalizedId, event.tagUid, event.at);
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

    if (!device.isPetAuthorized(petId) && device.authorizedPetIds.size >= 16)
      throw new BadRequestException(
        'El alimentador admite hasta 16 mascotas autorizadas.',
      );

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
    const id = requestId?.trim() || randomUUID();
    const saved = await this.feeding.findDispensing(user.id, device.id, id);
    const key = device.id + ':' + id;
    if (saved) {
      if (saved.source !== 'manual' || saved.targetGrams !== targetGrams)
        throw new ConflictException(
          'La solicitud ya existe con una cantidad u origen diferente.',
        );
      this.manualRequests.delete(key);
      return {
        requestId: id,
        deviceId: device.id,
        targetGrams: saved.targetGrams,
        requestedAt:
          saved.startedAt?.toISOString() ??
          saved.finishedAt?.toISOString() ??
          null,
        status: saved.status,
        dispatched: false,
      };
    }
    for (const [pendingKey, command] of this.manualRequests) {
      if (Date.now() - Date.parse(command.requestedAt) >= MANUAL_REQUEST_TTL_MS)
        this.manualRequests.delete(pendingKey);
    }
    const pending = this.manualRequests.get(key);
    if (pending && pending.targetGrams !== targetGrams)
      throw new ConflictException(
        'La solicitud ya existe con una cantidad diferente.',
      );
    if (
      !Number.isFinite(targetGrams) ||
      targetGrams <= 0 ||
      targetGrams > device.maxBowlGrams
    ) {
      throw new BadRequestException(
        `El objetivo manual debe estar entre 1 y ${device.maxBowlGrams} gramos.`,
      );
    }
    if (!this.messenger.connected || !this.messenger.sendManualDispense)
      throw new ServiceUnavailableException(
        'El broker no está conectado. Intenta de nuevo.',
      );
    const command: ManualDispenseCommand = pending ?? {
      kind: 'manualDispense',
      requestId: id,
      deviceId: device.id,
      targetGrams,
      requestedAt: new Date().toISOString(),
    };
    if (!pending && this.manualRequests.size >= MAX_MANUAL_REQUESTS)
      this.manualRequests.delete(this.manualRequests.keys().next().value!);
    this.manualRequests.set(key, command);
    this.messenger.sendManualDispense(device.id, command);
    return {
      requestId: id,
      deviceId: device.id,
      targetGrams,
      requestedAt: command.requestedAt,
      status: 'pending' as const,
      dispatched: this.messenger.connected,
    };
  }

  async requestServoPosition(user: User, id: string, input: ServoCommandDto) {
    const device = await this.getDevice(user, id);
    const now = Date.now();
    if (!this.messenger.connected || !this.messenger.sendServoPosition ||
        !device.lastSeenAt || now - device.lastSeenAt.getTime() > 45_000)
      throw new ServiceUnavailableException('El alimentador no está conectado.');
    for (const [requestId, request] of this.servoRequests) {
      if (now - Date.parse(request.requestedAt) > SERVO_REQUEST_TTL_MS)
        this.servoRequests.delete(requestId);
      else if (request.deviceId === device.id && request.status === 'pending' &&
               now - Date.parse(request.requestedAt) < 12_000)
        throw new ConflictException('Hay un movimiento pendiente de confirmación.');
    }
    if (this.servoRequests.size >= MAX_MANUAL_REQUESTS)
      throw new ServiceUnavailableException('Espera antes de enviar otro movimiento.');
    const command: ServoCommand = {
      ...input,
      kind: 'servoPosition',
      requestId: randomUUID(),
      deviceId: device.id,
      requestedAt: new Date(now).toISOString(),
    };
    this.servoRequests.set(command.requestId, { ...command, status: 'pending', reason: null });
    this.messenger.sendServoPosition(device.id, command);
    return this.servoRequests.get(command.requestId);
  }

  async getServoRequest(user: User, id: string, requestId: string) {
    const device = await this.getDevice(user, id);
    const request = this.servoRequests.get(requestId);
    if (!request || request.deviceId !== device.id)
      throw new NotFoundException('No se encontró la solicitud de movimiento.');
    return request;
  }

  async listScannedTags(
    user: User,
    deviceId: string,
  ): Promise<ScannedRfidTag[]> {
    const device = await this.getDevice(user, deviceId);
    const entries = this.getFreshScannedEntries(device.id);
    if (entries.length === 0) return [];

    const ownedTags = await this.pets.listTagsByOwner(user.id);
    const ownedMap = new Map(ownedTags.map((tag) => [tag.uid, tag]));

    return entries.map((entry) => {
      const existing = ownedMap.get(entry.tagUid);
      return {
        tagUid: entry.tagUid,
        scannedAt: new Date(entry.scannedAt),
        alreadyRegistered: Boolean(existing),
        assignedPetId: existing?.petId ?? null,
      };
    });
  }

  async findLatestUnassignedScannedTag(
    user: User,
    explicitFeederId?: string,
  ): Promise<string | null> {
    let targetId: string | null = null;
    if (explicitFeederId) {
      targetId = explicitFeederId.trim().toLowerCase();
    } else {
      const owned = await this.feeders.listByOwner(user.id);
      if (owned.length === 1) targetId = owned[0].id;
    }
    if (!targetId) return null;

    const recent = await this.listScannedTags(user, targetId);
    const candidate = recent.find((item) => item.assignedPetId === null);
    return candidate?.tagUid ?? null;
  }

  async clearScannedTagForOwner(
    ownerId: string,
    tagUid: string,
  ): Promise<void> {
    const cleanUid = tagUid.trim().toUpperCase();
    const owned = await this.feeders.listByOwner(ownerId);
    for (const device of owned) {
      const bucket = this.scannedTags.get(device.id);
      if (!bucket) continue;
      bucket.delete(cleanUid);
      if (bucket.size === 0) this.scannedTags.delete(device.id);
    }
  }

  private recordScannedTag(deviceId: string, tagUid: string, at: Date): void {
    const nowMs = Date.now();
    let bucket = this.scannedTags.get(deviceId);
    if (!bucket) {
      bucket = new Map<string, ScannedRfidEntry>();
      this.scannedTags.set(deviceId, bucket);
    }
    this.pruneScannedBucket(bucket, nowMs);

    const previous = bucket.get(tagUid);
    if (previous && at < previous.scannedAt) return;
    bucket.set(tagUid, {
      tagUid,
      scannedAt: new Date(at),
      receivedAtMs: nowMs,
    });

    if (bucket.size > MAX_SCANNED_TAGS_PER_DEVICE) {
      const ordered = [...bucket.values()].sort(
        (a, b) =>
          b.scannedAt.getTime() - a.scannedAt.getTime() ||
          b.receivedAtMs - a.receivedAtMs,
      );
      for (const stale of ordered.slice(MAX_SCANNED_TAGS_PER_DEVICE)) {
        bucket.delete(stale.tagUid);
      }
    }
  }

  private getFreshScannedEntries(deviceId: string): ScannedRfidEntry[] {
    const bucket = this.scannedTags.get(deviceId);
    if (!bucket) return [];
    this.pruneScannedBucket(bucket, Date.now());
    if (bucket.size === 0) {
      this.scannedTags.delete(deviceId);
      return [];
    }
    return [...bucket.values()].sort(
      (a, b) =>
        b.scannedAt.getTime() - a.scannedAt.getTime() ||
        b.receivedAtMs - a.receivedAtMs,
    );
  }

  private pruneScannedBucket(
    bucket: Map<string, ScannedRfidEntry>,
    nowMs: number,
  ): void {
    for (const [uid, entry] of bucket) {
      if (nowMs - entry.receivedAtMs > SCANNED_RFID_TTL_MS) {
        bucket.delete(uid);
      }
    }
  }

  private recordDiscoveredObservation(
    deviceId: string,
    at: Date,
    gate: GateState,
    fault: string | null,
  ): void {
    const previous = this.discovered.get(deviceId);
    if (previous?.lastSeenAt && at <= previous.lastSeenAt) return;
    if (!previous) {
      this.logger.log(
        `Alimentador no registrado detectado por MQTT: ${deviceId}`,
      );
    }
    this.discovered.set(deviceId, {
      deviceId,
      source: 'mqtt',
      lastSeenAt: new Date(at),
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
