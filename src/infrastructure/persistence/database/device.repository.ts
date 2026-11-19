import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { FeederDevice } from '../../../domain/entities/FeederDevice.js';
import type { GateState } from '../../../domain/entities/FeederDevice.js';
import type {
  AuthorizedPetConfig,
  DeviceRepository,
  PendingPlan,
} from '../../../domain/repositories/device.repository.js';
import { FeederDeviceMapper } from './mappers/feeder-device.mapper.js';
import { FeedingPlanModel } from './models/feeding-plan.model.js';
import { FeederDeviceModel } from './models/feeder-device.model.js';
import { PetModel } from './models/pet.model.js';
import { RfidTagModel } from './models/rfid-tag.model.js';

/** Adaptador de persistencia de alimentadores sobre PostgreSQL. */
@Injectable()
export class DatabaseDeviceRepository implements DeviceRepository {
  constructor(
    @InjectRepository(FeederDeviceModel)
    private readonly store: Repository<FeederDeviceModel>,
  ) {}

  async requireDevice(id: string): Promise<void> {
    if (!(await this.store.existsBy({ id })))
      throw new NotFoundException('No se encontró el alimentador.');
  }

  async pendingPlans(): Promise<PendingPlan[]> {
    const rows = await this.store
      .createQueryBuilder('device')
      .leftJoin(FeedingPlanModel, 'plan', 'plan.deviceId = device.id')
      .select('device.id', 'deviceId')
      .addSelect('device.ownerId', 'ownerId')
      .addSelect('device.desiredRevision', 'revision')
      .addSelect('device.maxBowlGrams', 'maxBowlGrams')
      .addSelect('device.authorizedPetIds', 'authorizedPetIds')
      .addSelect('COALESCE(plan.enabled, false)', 'enabled')
      .addSelect(
        'COALESCE(plan.maxDailyDispensedGrams, 0)',
        'maxDailyDispensedGrams',
      )
      .addSelect("COALESCE(plan.slots, '[]'::jsonb)", 'slots')
      .where('device.desiredRevision > device.appliedRevision')
      .getRawMany<
        PendingPlan & { ownerId: string; authorizedPetIds: string[] }
      >();

    const results: PendingPlan[] = [];
    for (const row of rows) {
      const petIds = Array.isArray(row.authorizedPetIds)
        ? row.authorizedPetIds
        : [];
      let authorizedPets: AuthorizedPetConfig[] = [];
      if (petIds.length > 0) {
        const [pets, tags] = await Promise.all([
          this.store.manager.find(PetModel, {
            where: { ownerId: row.ownerId, id: In(petIds) },
          }),
          this.store.manager.find(RfidTagModel, {
            where: { ownerId: row.ownerId, petId: In(petIds), active: true },
          }),
        ]);
        const petMap = new Map(pets.map((p) => [p.id, p]));
        const tagMap = new Map(
          tags
            .filter((t): t is RfidTagModel & { petId: string } => t.petId !== null)
            .map((t) => [t.petId, t]),
        );
        authorizedPets = petIds.map((petId) => ({
          petId,
          tagUid: tagMap.get(petId)?.uid ?? null,
          dailyLimitGrams: petMap.get(petId)?.dailyLimitGrams ?? null,
        }));
      }
      results.push({
        deviceId: row.deviceId,
        revision: row.revision,
        maxBowlGrams: row.maxBowlGrams,
        enabled: Boolean(row.enabled),
        maxDailyDispensedGrams: Number(row.maxDailyDispensedGrams),
        slots: Array.isArray(row.slots) ? row.slots : [],
        authorizedPetIds: petIds,
        authorizedPets,
      });
    }
    return results;
  }

  async confirmPlan(id: string, revision: number): Promise<void> {
    await this.store.manager.transaction(async (manager) => {
      const row = await manager.findOne(FeederDeviceModel, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row)
        throw new NotFoundException('No se encontró el alimentador.');
      if (revision > row.desiredRevision)
        throw new ConflictException('La revisión no fue solicitada.');
      if (
        revision !== row.desiredRevision ||
        revision <= row.appliedRevision
      )
        return;
      const device = FeederDeviceMapper.toDomain(row);
      device.confirmApplied(revision);
      await manager.update(
        FeederDeviceModel,
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
      const row = await manager.findOne(FeederDeviceModel, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row)
        throw new NotFoundException('No se encontró el alimentador.');
      if (row.lastSeenAt && at <= row.lastSeenAt) return;
      const device = FeederDeviceMapper.toDomain(row);
      device.updateObservedState(at, weight, gate, fault);
      await manager.update(
        FeederDeviceModel,
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
    return row ? FeederDeviceMapper.toDomain(row) : null;
  }

  async listByOwner(ownerId: string): Promise<FeederDevice[]> {
    const rows = await this.store.find({
      where: { ownerId },
      order: { name: 'ASC' },
    });
    return rows.map((row) => FeederDeviceMapper.toDomain(row));
  }

  async create(device: FeederDevice): Promise<FeederDevice> {
    try {
      await this.store.insert(FeederDeviceMapper.toModel(device));
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
    const model = FeederDeviceMapper.toModel(device);
    const result = await this.store.update(
      { id: device.id, ownerId: device.ownerId },
      {
        name: model.name,
        authorizedPetIds: model.authorizedPetIds,
        desiredRevision: model.desiredRevision,
      },
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
