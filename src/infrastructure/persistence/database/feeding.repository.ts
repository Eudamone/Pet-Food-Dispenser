import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, type EntityTarget, type ObjectLiteral } from 'typeorm';
import type { AccessSession } from '../../../domain/entities/AccessSession.js';
import type { DispensingRecord } from '../../../domain/entities/DispensingRecord.js';
import type { FeedingPlan } from '../../../domain/entities/FeedingPlan.js';
import type {
  FeedingRepository,
  PlanRevision,
} from '../../../domain/repositories/feeding.repository.js';
import { AccessSessionMapper } from './mappers/access-session.mapper.js';
import { DispensingRecordMapper } from './mappers/dispensing-record.mapper.js';
import { FeederDeviceMapper } from './mappers/feeder-device.mapper.js';
import { FeedingPlanMapper } from './mappers/feeding-plan.mapper.js';
import { AccessSessionModel } from './models/access-session.model.js';
import { DispensingRecordModel } from './models/dispensing-record.model.js';
import { FeederDeviceModel } from './models/feeder-device.model.js';
import { FeedingPlanModel } from './models/feeding-plan.model.js';

@Injectable()
export class DatabaseFeedingRepository implements FeedingRepository {
  constructor(private readonly database: DataSource) {}

  async saveAccess(session: AccessSession): Promise<void> {
    await this.database
      .getRepository(AccessSessionModel)
      .createQueryBuilder()
      .insert()
      .values(AccessSessionMapper.toModel(session))
      .orIgnore()
      .execute();
  }

  async saveDispensing(record: DispensingRecord): Promise<void> {
    await this.database
      .getRepository(DispensingRecordModel)
      .createQueryBuilder()
      .insert()
      .values(DispensingRecordMapper.toModel(record))
      .orIgnore()
      .execute();
  }

  async listAccess(
    ownerId: string,
    deviceId: string,
  ): Promise<AccessSession[]> {
    const rows = await this.history(AccessSessionModel, ownerId, deviceId)
      .orderBy('record.openedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('record.id', 'DESC')
      .take(100)
      .getMany();
    return rows.map((row) => AccessSessionMapper.toDomain(row));
  }

  async listAccessByDay(
    ownerId: string,
    deviceId: string,
    petId: string,
    day: string,
  ): Promise<AccessSession[]> {
    const rows = await this.history(AccessSessionModel, ownerId, deviceId)
      .andWhere('record.accountingDay = :day AND record.petId = :petId', {
        day,
        petId,
      })
      .getMany();
    return rows.map((row) => AccessSessionMapper.toDomain(row));
  }

  async listDispensing(
    ownerId: string,
    deviceId: string,
  ): Promise<DispensingRecord[]> {
    const rows = await this.history(DispensingRecordModel, ownerId, deviceId)
      .orderBy('record.startedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('record.id', 'DESC')
      .take(100)
      .getMany();
    return rows.map((row) => DispensingRecordMapper.toDomain(row));
  }

  async findDispensing(ownerId: string, deviceId: string, id: string) {
    const row = await this.history(DispensingRecordModel, ownerId, deviceId)
      .andWhere('record.id = :id', { id })
      .getOne();
    return row ? DispensingRecordMapper.toDomain(row) : null;
  }

  private history<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    ownerId: string,
    deviceId: string,
  ) {
    return this.database
      .getRepository(entity)
      .createQueryBuilder('record')
      .innerJoin(FeederDeviceModel, 'device', 'device.id = record.deviceId')
      .where('record.deviceId = :deviceId AND device.ownerId = :ownerId', {
        deviceId,
        ownerId,
      });
  }

  async findPlanByDevice(
    ownerId: string,
    deviceId: string,
  ): Promise<FeedingPlan | null> {
    const row = await this.database
      .getRepository(FeedingPlanModel)
      .createQueryBuilder('plan')
      .innerJoin(FeederDeviceModel, 'device', 'device.id = plan.deviceId')
      .where('plan.deviceId = :deviceId AND device.ownerId = :ownerId', {
        deviceId,
        ownerId,
      })
      .getOne();
    return row ? FeedingPlanMapper.toDomain(row) : null;
  }

  savePlan(
    ownerId: string,
    plan: FeedingPlan,
    expectedRevision: number,
  ): Promise<PlanRevision> {
    return this.database.transaction(async (manager) => {
      const row = await manager.findOne(FeederDeviceModel, {
        where: { id: plan.deviceId, ownerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException('No se encontró el alimentador.');
      if (row.desiredRevision !== expectedRevision)
        throw new ConflictException(
          'La revisión cambió. Actualiza el plan antes de guardar.',
        );
      if (expectedRevision === 2147483647)
        throw new ConflictException(
          'El alimentador alcanzó el máximo de revisiones.',
        );

      const device = FeederDeviceMapper.toDomain(row);
      device.markRequested(device.desiredRevision + 1);
      await manager.save(FeedingPlanModel, FeedingPlanMapper.toModel(plan));
      await manager.update(
        FeederDeviceModel,
        { id: device.id, ownerId },
        {
          desiredRevision: device.desiredRevision,
        },
      );

      return {
        desiredRevision: device.desiredRevision,
        appliedRevision: device.appliedRevision,
      };
    });
  }
}
