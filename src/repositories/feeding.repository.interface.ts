// feeding.repository.interface.ts
import type { LocalDate } from '@/helpers/local-date.vo.js';
import type { FeedingPlan } from '@/models/feeding-plan.model.js';
import type { DispensingRecord } from '@/models/dispensing-record.model.js';
import type { AccessSession } from '@/models/access-session.model.js';
import type { Id, Instant } from '@/models/types.js';

export interface FeedingRepository {
  findPlanByDevice(deviceId: Id): Promise<FeedingPlan | null>;
  savePlan(plan: FeedingPlan): Promise<void>;

  saveDispensing(record: DispensingRecord): Promise<void>;
  saveAccess(session: AccessSession): Promise<void>;

  listDispensing(
    deviceId: Id,
    from: Instant | null,
    to: Instant | null,
  ): Promise<DispensingRecord[]>;
  listAccessByDay(deviceId: Id, day: LocalDate): Promise<AccessSession[]>;
  listAccess(
    deviceId: Id,
    from: Instant | null,
    to: Instant | null,
  ): Promise<AccessSession[]>;
}

export const FEEDING_REPOSITORY = Symbol('FeedingRepository');
