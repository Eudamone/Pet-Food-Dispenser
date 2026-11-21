import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FeederDevice } from '../../../domain/entities/FeederDevice.js';
import type { GateState } from '../../../domain/entities/FeederDevice.js';
import type {
  DeviceRepository,
  PendingPlan,
} from '../../../domain/repositories/device.repository.js';
import { MemoryDatabase } from './memory.database.js';

/** Repositorio de alimentadores en memoria (desarrollo y pruebas). */
@Injectable()
export class MemoryDeviceRepository implements DeviceRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async exists(id: string): Promise<boolean> {
    return this.db.devices.has(id);
  }

  async requireDevice(id: string): Promise<void> {
    if (!this.db.devices.has(id))
      throw new NotFoundException('No se encontró el alimentador.');
  }

  async pendingPlans(): Promise<PendingPlan[]> {
    const pending: PendingPlan[] = [];
    for (const [deviceId, device] of this.db.devices) {
      if (!device.hasPendingConfiguration()) continue;
      const plan = this.db.plans.get(deviceId);
      const authorizedPetIds = [...device.authorizedPetIds];
      const authorizedPets = authorizedPetIds.map((petId) => {
        const pet = this.db.pets.get(this.db.petKey(device.ownerId, petId));
        const activeTag = [...this.db.tags.values()].find(
          (tag) =>
            tag.ownerId === device.ownerId &&
            tag.petId === petId &&
            tag.active,
        );
        return {
          petId,
          tagUid: activeTag?.uid ?? null,
          dailyLimitGrams: pet?.dailyLimitGrams ?? null,
        };
      });
      pending.push({
        deviceId,
        revision: device.desiredRevision,
        maxBowlGrams: device.maxBowlGrams,
        enabled: plan?.enabled ?? false,
        maxDailyDispensedGrams: plan?.maxDailyDispensedGrams ?? 0,
        slots: plan ? [...plan.slots] : [],
        authorizedPetIds,
        authorizedPets,
      });
    }
    return pending;
  }

  async confirmPlan(id: string, revision: number): Promise<void> {
    const device = this.db.devices.get(id);
    if (!device)
      throw new NotFoundException('No se encontró el alimentador.');
    if (revision > device.desiredRevision)
      throw new ConflictException('La revisión no fue solicitada.');
    if (revision !== device.desiredRevision || revision <= device.appliedRevision)
      return;
    device.confirmApplied(revision);
  }

  async saveObservedState(
    id: string,
    at: Date,
    weight: number | null,
    gate: GateState,
    fault: string | null,
  ): Promise<void> {
    const device = this.db.devices.get(id);
    if (!device)
      throw new NotFoundException('No se encontró el alimentador.');
    if (device.lastSeenAt && at <= device.lastSeenAt) return;
    device.updateObservedState(at, weight, gate, fault);
  }

  async findById(ownerId: string, id: string): Promise<FeederDevice | null> {
    const device = this.db.devices.get(id);
    return device && device.ownerId === ownerId ? device : null;
  }

  async listByOwner(ownerId: string): Promise<FeederDevice[]> {
    return [...this.db.devices.values()]
      .filter((device) => device.ownerId === ownerId)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async create(device: FeederDevice): Promise<FeederDevice> {
    if (this.db.devices.has(device.id))
      throw new ConflictException('El equipo ya está registrado.');
    this.db.devices.set(device.id, device);
    return device;
  }

  async saveDevice(device: FeederDevice): Promise<FeederDevice> {
    const stored = this.db.devices.get(device.id);
    if (!stored || stored.ownerId !== device.ownerId)
      throw new NotFoundException('No se encontró el equipo.');
    this.db.devices.set(device.id, device);
    return device;
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const stored = this.db.devices.get(id);
    if (!stored || stored.ownerId !== ownerId)
      throw new NotFoundException('No se encontró el equipo.');
    const hasHistory =
      [...this.db.access.values()].some((s) => s.deviceId === id) ||
      [...this.db.dispensing.values()].some((r) => r.deviceId === id);
    if (hasHistory)
      throw new ConflictException(
        'El alimentador tiene historial y no se puede eliminar.',
      );
    this.db.devices.delete(id);
    this.db.plans.delete(id);
  }
}
