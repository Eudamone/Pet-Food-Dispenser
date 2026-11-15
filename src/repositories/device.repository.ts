import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeederDevice, type GateState } from '../domain/FeederDevice.js';
import { FeedingPlan } from '../domain/FeedingPlan.js';

@Injectable()
export class DeviceRepository {
  constructor(
    @InjectRepository(FeederDevice)
    private readonly store: Repository<FeederDevice>,
  ) {}

  async requireDevice(id: string): Promise<void> {
    if (!(await this.store.existsBy({ id })))
      throw new NotFoundException('No se encontró el alimentador.');
  }

  pendingPlans() {
    return this.store
      .createQueryBuilder('device')
      .innerJoin(FeedingPlan, 'plan', 'plan.deviceId = device.id')
      .select('device.id', 'deviceId')
      .addSelect('device.desiredRevision', 'revision')
      .addSelect('device.maxBowlGrams', 'maxBowlGrams')
      .addSelect('plan.enabled', 'enabled')
      .addSelect('plan.maxDailyDispensedGrams', 'maxDailyDispensedGrams')
      .addSelect('plan.slots', 'slots')
      .where('device.desiredRevision > device.appliedRevision')
      .getRawMany<{
        deviceId: string;
        revision: number;
        maxBowlGrams: number;
        enabled: boolean;
        maxDailyDispensedGrams: number;
        slots: object[];
      }>();
  }

  async confirmPlan(id: string, revision: number): Promise<void> {
    await this.store.manager.transaction(async (manager) => {
      const device = await manager.findOne(FeederDevice, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!device)
        throw new NotFoundException('No se encontró el alimentador.');
      if (revision > device.desiredRevision)
        throw new ConflictException('La revisión no fue solicitada.');
      if (
        revision !== device.desiredRevision ||
        revision <= device.appliedRevision
      )
        return;
      device.confirmApplied(revision);
      await manager.update(
        FeederDevice,
        { id },
        { appliedRevision: device.appliedRevision },
      );
    });
  }

  async saveObservedState(
    id: string,
    at: Date,
    weight: number | null,
    gate: GateState,
    fault: string | null,
  ): Promise<void> {
    await this.store.manager.transaction(async (manager) => {
      const device = await manager.findOne(FeederDevice, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!device)
        throw new NotFoundException('No se encontró el alimentador.');
      if (device.lastSeenAt && at <= device.lastSeenAt) return;
      device.updateObservedState(at, weight, gate, fault);
      await manager.update(
        FeederDevice,
        { id },
        {
          lastSeenAt: device.lastSeenAt,
          lastBowlGrams: device.lastBowlGrams,
          gateState: device.gateState,
          lastFault: device.lastFault,
        },
      );
    });
  }

  async findById(ownerId: string, id: string): Promise<FeederDevice | null> {
    const row = await this.store.findOneBy({ ownerId, id });
    return row;
  }

  async listByOwner(ownerId: string): Promise<FeederDevice[]> {
    return this.store.find({ where: { ownerId }, order: { name: 'ASC' } });
  }

  async create(device: FeederDevice): Promise<FeederDevice> {
    try {
      await this.store.insert(device);
      return device;
    } catch (error) {
      if (
        (error as { driverError?: { code?: string } }).driverError?.code ===
        '23505'
      ) {
        throw new ConflictException('El equipo ya está registrado.');
      }
      throw error;
    }
  }

  async saveDevice(device: FeederDevice): Promise<FeederDevice> {
    const result = await this.store.update(
      { id: device.id, ownerId: device.ownerId },
      { name: device.name },
    );
    if (!result.affected)
      throw new NotFoundException('No se encontró el equipo.');
    return (await this.findById(device.ownerId, device.id))!;
  }

  async delete(ownerId: string, id: string): Promise<void> {
    try {
      const result = await this.store.delete({ ownerId, id });
      if (!result.affected)
        throw new NotFoundException('No se encontró el equipo.');
    } catch (error) {
      if (
        (error as { driverError?: { code?: string } }).driverError?.code ===
        '23503'
      )
        throw new ConflictException(
          'El alimentador tiene historial y no se puede eliminar.',
        );
      throw error;
    }
  }
}
