import type { AccessSession } from '../entities/AccessSession.js';
import type { DispensingRecord } from '../entities/DispensingRecord.js';
import type { FeedingPlan } from '../entities/FeedingPlan.js';

export const FEEDING_REPOSITORY = Symbol('FEEDING_REPOSITORY');

export type PlanRevision = {
  desiredRevision: number;
  appliedRevision: number;
};

export interface FeedingRepository {
  saveAccess(session: AccessSession): Promise<void>;
  saveDispensing(record: DispensingRecord): Promise<void>;
  listAccess(ownerId: string, deviceId: string): Promise<AccessSession[]>;
  listAccessByDay(
    ownerId: string,
    deviceId: string,
    petId: string,
    day: string,
  ): Promise<AccessSession[]>;
  listDispensing(
    ownerId: string,
    deviceId: string,
  ): Promise<DispensingRecord[]>;
  findPlanByDevice(
    ownerId: string,
    deviceId: string,
  ): Promise<FeedingPlan | null>;
  savePlan(
    ownerId: string,
    plan: FeedingPlan,
    expectedRevision: number,
  ): Promise<PlanRevision>;
}
