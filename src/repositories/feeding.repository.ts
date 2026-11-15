import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, type EntityTarget } from 'typeorm';
import { AccessSession } from '../domain/AccessSession.js';
import { DispensingRecord } from '../domain/DispensingRecord.js';
import { FeederDevice } from '../domain/FeederDevice.js';
import { FeedingPlan } from '../domain/FeedingPlan.js';

@Injectable()
export class FeedingRepository {
  constructor(private readonly database: DataSource) {}

  async saveAccess(session: AccessSession): Promise<void> {
    await this.database
      .getRepository(AccessSession)
      .createQueryBuilder()
      .insert()
      .values(session)
      .orIgnore()
      .execute();
  }

  async saveDispensing(record: DispensingRecord): Promise<void> {
    await this.database
      .getRepository(DispensingRecord)
      .createQueryBuilder()
      .insert()
      .values(record)
      .orIgnore()
      .execute();
  }

  listAccess(ownerId: string, deviceId: string): Promise<AccessSession[]> {
    return this.history(AccessSession, ownerId, deviceId)
      .orderBy('record.openedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('record.id', 'DESC')
      .take(100)
      .getMany();
  }

  listAccessByDay(
    ownerId: string,
    deviceId: string,
    petId: string,
    day: string,
  ): Promise<AccessSession[]> {
    return this.history(AccessSession, ownerId, deviceId)
      .andWhere('record.accountingDay = :day AND record.petId = :petId', {
        day,
        petId,
      })
      .getMany();
  }

  listDispensing(
    ownerId: string,
    deviceId: string,
  ): Promise<DispensingRecord[]> {
    return this.history(DispensingRecord, ownerId, deviceId)
      .orderBy('record.startedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('record.id', 'DESC')
      .take(100)
      .getMany();
  }

  private history<T extends AccessSession | DispensingRecord>(
    entity: EntityTarget<T>,
    ownerId: string,
    deviceId: string,
  ) {
    return this.database
      .getRepository(entity)
      .createQueryBuilder('record')
      .innerJoin(FeederDevice, 'device', 'device.id = record.deviceId')
      .where('record.deviceId = :deviceId AND device.ownerId = :ownerId', {
        deviceId,
        ownerId,
      });
  }

  findPlanByDevice(
    ownerId: string,
    deviceId: string,
  ): Promise<FeedingPlan | null> {
    return this.database
      .getRepository(FeedingPlan)
      .createQueryBuilder('plan')
      .innerJoin(FeederDevice, 'device', 'device.id = plan.deviceId')
      .where('plan.deviceId = :deviceId AND device.ownerId = :ownerId', {
        deviceId,
        ownerId,
      })
      .getOne();
  }

  savePlan(ownerId: string, plan: FeedingPlan, expectedRevision: number) {
    return this.database.transaction(async (manager) => {
      const device = await manager.findOne(FeederDevice, {
        where: { id: plan.deviceId, ownerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!device)
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
      await manager.save(FeedingPlan, plan);
      await manager.update(
        FeederDevice,
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
