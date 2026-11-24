import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AccessSession } from '../../../domain/entities/AccessSession.js';
import type { DispensingRecord } from '../../../domain/entities/DispensingRecord.js';
import type { FeedingPlan } from '../../../domain/entities/FeedingPlan.js';
import type {
  FeedingRepository,
  PlanRevision,
} from '../../../domain/repositories/feeding.repository.js';
import { MemoryDatabase } from './memory.database.js';

@Injectable()
export class MemoryFeedingRepository implements FeedingRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async saveAccess(session: AccessSession): Promise<void> {
    const key = this.db.recordKey(session.id, session.deviceId);
    if (!this.db.access.has(key)) this.db.access.set(key, session);
  }

  async saveDispensing(record: DispensingRecord): Promise<void> {
    const key = this.db.recordKey(record.id, record.deviceId);
    if (!this.db.dispensing.has(key)) this.db.dispensing.set(key, record);
  }

  findDispensing(ownerId: string, deviceId: string, id: string) {
    if (!this.ownedBy(deviceId, ownerId)) return Promise.resolve(null);
    return Promise.resolve(
      this.db.dispensing.get(this.db.recordKey(id, deviceId)) ?? null,
    );
  }

  async listAccess(
    ownerId: string,
    deviceId: string,
  ): Promise<AccessSession[]> {
    if (!this.ownedBy(deviceId, ownerId)) return [];
    return [...this.db.access.values()]
      .filter((session) => session.deviceId === deviceId)
      .sort(
        (a, b) =>
          nullsLastDesc(
            a.openedAt?.getTime() ?? null,
            b.openedAt?.getTime() ?? null,
          ) || b.id.localeCompare(a.id, 'en'),
      )
      .slice(0, 100);
  }

  async listAccessByDay(
    ownerId: string,
    deviceId: string,
    petId: string,
    day: string,
  ): Promise<AccessSession[]> {
    if (!this.ownedBy(deviceId, ownerId)) return [];
    return [...this.db.access.values()].filter(
      (session) =>
        session.deviceId === deviceId &&
        session.petId === petId &&
        session.accountingDay === day,
    );
  }

  async listDispensing(
    ownerId: string,
    deviceId: string,
  ): Promise<DispensingRecord[]> {
    if (!this.ownedBy(deviceId, ownerId)) return [];
    return [...this.db.dispensing.values()]
      .filter((record) => record.deviceId === deviceId)
      .sort(
        (a, b) =>
          nullsLastDesc(
            a.startedAt?.getTime() ?? null,
            b.startedAt?.getTime() ?? null,
          ) || b.id.localeCompare(a.id, 'en'),
      )
      .slice(0, 100);
  }

  findPlanByDevice(
    ownerId: string,
    deviceId: string,
  ): Promise<FeedingPlan | null> {
    if (!this.ownedBy(deviceId, ownerId)) return Promise.resolve(null);
    return Promise.resolve(this.db.plans.get(deviceId) ?? null);
  }

  savePlan(
    ownerId: string,
    plan: FeedingPlan,
    expectedRevision: number,
  ): Promise<PlanRevision> {
    const device = this.db.devices.get(plan.deviceId);
    if (!device || device.ownerId !== ownerId)
      throw new NotFoundException('No se encontró el alimentador.');
    if (device.desiredRevision !== expectedRevision)
      throw new ConflictException(
        'La revisión cambió. Actualiza el plan antes de guardar.',
      );
    if (expectedRevision === 2147483647)
      throw new ConflictException(
        'El alimentador alcanzó el máximo de revisiones.',
      );

    device.markRequested(device.desiredRevision + 1);
    this.db.plans.set(plan.deviceId, plan);

    return Promise.resolve({
      desiredRevision: device.desiredRevision,
      appliedRevision: device.appliedRevision,
    });
  }

  private ownedBy(deviceId: string, ownerId: string): boolean {
    return this.db.devices.get(deviceId)?.ownerId === ownerId;
  }
}

function nullsLastDesc(a: number | null, b: number | null): number {
  if (a === null || b === null) {
    if (a === null && b === null) return 0;
    return a === null ? 1 : -1;
  }
  return b - a;
}
