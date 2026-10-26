// feeding.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { FeedingRepository } from '@/repositories/feeding.repository.interface.js';
import { FeedingPlanOrmEntity } from '@/database/feeding-plan.entity.js';
import { DispensingRecordOrmEntity } from '@/database/dispensing-record.entity.js';
import { AccessSessionOrmEntity } from '@/database/access-session.entity.js';
import { LocalDate, Day } from '@/helpers/local-date.vo.js';
import { LocalTime } from '@/helpers/local-time.vo.js';
import { FeedingPlan } from '@/models/feeding-plan.model.js';
import { FeedingSlot } from '@/models/feeding-slot.model.js';
import { DispensingRecord } from '@/models/dispensing-record.model.js';
import { AccessSession } from '@/models/access-session.model.js';
import type { FeedingSlotConfiguration } from '@/models/configuration.model.js';
import type { Id, Instant } from '@/models/types.js';

@Injectable()
export class TypeOrmFeedingRepository implements FeedingRepository {
  constructor(
    @InjectRepository(FeedingPlanOrmEntity)
    private readonly plans: Repository<FeedingPlanOrmEntity>,
    @InjectRepository(DispensingRecordOrmEntity)
    private readonly dispensing: Repository<DispensingRecordOrmEntity>,
    @InjectRepository(AccessSessionOrmEntity)
    private readonly access: Repository<AccessSessionOrmEntity>,
  ) {}

  async findPlanByDevice(deviceId: Id): Promise<FeedingPlan | null> {
    const entity = await this.plans.findOne({ where: { deviceId } });
    return entity ? this.planToDomain(entity) : null;
  }

  async savePlan(plan: FeedingPlan): Promise<void> {
    await this.plans.save(this.planToOrm(plan));
  }

  async saveDispensing(record: DispensingRecord): Promise<void> {
    await this.dispensing.save(this.dispensingToOrm(record));
  }

  async saveAccess(session: AccessSession): Promise<void> {
    await this.access.save(this.accessToOrm(session));
  }

  async listDispensing(
    deviceId: Id,
    from: Instant | null,
    to: Instant | null,
  ): Promise<DispensingRecord[]> {
    const where: FindOptionsWhere<DispensingRecordOrmEntity> = { deviceId };
    const range = this.range(from, to);
    if (range) {
      where.startedAt = range;
    }
    return (await this.dispensing.find({ where })).map((entity) =>
      this.dispensingToDomain(entity),
    );
  }

  async listAccessByDay(deviceId: Id, day: LocalDate): Promise<AccessSession[]> {
    const entities = await this.access.find({
      where: { deviceId, accountingDay: day.toString() },
    });
    return entities.map((entity) => this.accessToDomain(entity));
  }

  async listAccess(
    deviceId: Id,
    from: Instant | null,
    to: Instant | null,
  ): Promise<AccessSession[]> {
    const where: FindOptionsWhere<AccessSessionOrmEntity> = { deviceId };
    const range = this.range(from, to);
    if (range) {
      where.openedAt = range;
    }
    return (await this.access.find({ where })).map((entity) =>
      this.accessToDomain(entity),
    );
  }

  private range(from: Instant | null, to: Instant | null) {
    if (from && to) {
      return Between(from, to);
    }
    if (from) {
      return MoreThanOrEqual(from);
    }
    if (to) {
      return LessThanOrEqual(to);
    }
    return null;
  }

  private planToDomain(entity: FeedingPlanOrmEntity): FeedingPlan {
    const slots = (entity.slots ?? []).map((slot) =>
      FeedingSlot.create({
        id: slot.id,
        time: LocalTime.parse(slot.time),
        days: slot.days as Day[],
        targetGrams: slot.targetGrams,
        enabled: slot.enabled,
      }),
    );
    return new FeedingPlan(
      entity.id,
      entity.deviceId,
      slots,
      entity.enabled,
      entity.maxDailyDispensedGrams,
    );
  }

  private planToOrm(plan: FeedingPlan): FeedingPlanOrmEntity {
    const entity = new FeedingPlanOrmEntity();
    entity.id = plan.id;
    entity.deviceId = plan.deviceId;
    entity.enabled = plan.enabled;
    entity.maxDailyDispensedGrams = plan.maxDailyDispensedGrams;
    entity.slots = plan.slots.map<FeedingSlotConfiguration>((slot) => ({
      id: slot.id,
      time: slot.time.toString(),
      days: slot.days,
      targetGrams: slot.targetGrams,
      enabled: slot.enabled,
    }));
    return entity;
  }

  private dispensingToDomain(entity: DispensingRecordOrmEntity): DispensingRecord {
    return new DispensingRecord(
      entity.id,
      entity.deviceId,
      entity.slotId,
      entity.source,
      entity.targetGrams,
      entity.initialGrams,
      entity.finalGrams,
      entity.measurementValid,
      entity.status,
      entity.startedAt,
      entity.finishedAt,
      entity.reason,
    );
  }

  private dispensingToOrm(record: DispensingRecord): DispensingRecordOrmEntity {
    const entity = new DispensingRecordOrmEntity();
    entity.id = record.id;
    entity.deviceId = record.deviceId;
    entity.slotId = record.slotId;
    entity.source = record.source;
    entity.targetGrams = record.targetGrams;
    entity.initialGrams = record.initialGrams;
    entity.finalGrams = record.finalGrams;
    entity.measurementValid = record.measurementValid;
    entity.status = record.status;
    entity.startedAt = record.startedAt;
    entity.finishedAt = record.finishedAt;
    entity.reason = record.reason;
    return entity;
  }

  private accessToDomain(entity: AccessSessionOrmEntity): AccessSession {
    return new AccessSession(
      entity.id,
      entity.deviceId,
      entity.tagUid,
      entity.petId,
      LocalDate.parse(entity.accountingDay),
      entity.openedAt,
      entity.closedAt,
      entity.initialGrams,
      entity.finalGrams,
      entity.measurementValid,
      entity.status,
      entity.issue,
    );
  }

  private accessToOrm(session: AccessSession): AccessSessionOrmEntity {
    const entity = new AccessSessionOrmEntity();
    entity.id = session.id;
    entity.deviceId = session.deviceId;
    entity.tagUid = session.tagUid;
    entity.petId = session.petId;
    entity.accountingDay = session.accountingDay.toString();
    entity.openedAt = session.openedAt;
    entity.closedAt = session.closedAt;
    entity.initialGrams = session.initialGrams;
    entity.finalGrams = session.finalGrams;
    entity.measurementValid = session.measurementValid;
    entity.status = session.status;
    entity.issue = session.issue;
    return entity;
  }
}
