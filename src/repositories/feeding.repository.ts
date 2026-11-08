import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FeederDevice } from '../domain/FeederDevice.js';
import { FeedingPlan } from '../domain/FeedingPlan.js';

@Injectable()
export class FeedingRepository {
  constructor(private readonly database: DataSource) {}

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
