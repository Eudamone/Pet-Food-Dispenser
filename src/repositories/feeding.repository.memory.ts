// feeding.repository.memory.ts
import { Injectable, Optional } from '@nestjs/common';
import { FeedingRepository } from '@/repositories/feeding.repository.interface.js';
import { InMemoryStorageClient } from '@/repositories/storage.client.js';
import type { StorageClient } from '@/repositories/storage.client.js';
import type { LocalDate } from '@/helpers/local-date.vo.js';
import type { FeedingPlan } from '@/models/feeding-plan.model.js';
import type { DispensingRecord } from '@/models/dispensing-record.model.js';
import type { AccessSession } from '@/models/access-session.model.js';
import type { Id, Instant } from '@/models/types.js';

const PLANS = 'feeding-plans';
const DISPENSING = 'dispensing-records';
const ACCESS = 'access-sessions';

@Injectable()
export class InMemoryFeedingRepository implements FeedingRepository {
  private readonly store: StorageClient;

  constructor(@Optional() store: StorageClient = new InMemoryStorageClient()) {
    this.store = store;
  }

  async findPlanByDevice(deviceId: Id): Promise<FeedingPlan | null> {
    const plans = await this.store.list<FeedingPlan>(PLANS);
    return plans.find((plan) => plan.deviceId === deviceId) ?? null;
  }

  async savePlan(plan: FeedingPlan): Promise<void> {
    await this.store.set<FeedingPlan>(PLANS, plan.id, plan);
  }

  async saveDispensing(record: DispensingRecord): Promise<void> {
    await this.store.set<DispensingRecord>(DISPENSING, record.id, record);
  }

  async saveAccess(session: AccessSession): Promise<void> {
    await this.store.set<AccessSession>(ACCESS, session.id, session);
  }

  async listDispensing(
    deviceId: Id,
    from: Instant | null,
    to: Instant | null,
  ): Promise<DispensingRecord[]> {
    return (await this.store.list<DispensingRecord>(DISPENSING)).filter(
      (record) =>
        record.deviceId === deviceId &&
        InMemoryFeedingRepository.withinRange(record.startedAt, from, to),
    );
  }

  async listAccessByDay(deviceId: Id, day: LocalDate): Promise<AccessSession[]> {
    return (await this.store.list<AccessSession>(ACCESS)).filter(
      (session) => session.deviceId === deviceId && session.accountingDay.equals(day),
    );
  }

  async listAccess(
    deviceId: Id,
    from: Instant | null,
    to: Instant | null,
  ): Promise<AccessSession[]> {
    return (await this.store.list<AccessSession>(ACCESS)).filter(
      (session) =>
        session.deviceId === deviceId &&
        InMemoryFeedingRepository.withinRange(session.openedAt, from, to),
    );
  }

  private static withinRange(
    value: Date | null,
    from: Instant | null,
    to: Instant | null,
  ): boolean {
    const time = value?.getTime();
    if (time === undefined) {
      return from === null && to === null;
    }
    if (from !== null && time < from.getTime()) {
      return false;
    }
    if (to !== null && time > to.getTime()) {
      return false;
    }
    return true;
  }
}
