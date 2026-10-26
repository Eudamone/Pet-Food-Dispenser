// feeding.service.ts
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FEEDING_REPOSITORY } from '@/repositories/feeding.repository.interface.js';
import type { FeedingRepository } from '@/repositories/feeding.repository.interface.js';
import { PET_REPOSITORY } from '@/repositories/pet.repository.interface.js';
import type { PetRepository } from '@/repositories/pet.repository.interface.js';
import { DeviceService } from '@/services/device.service.js';
import { FeedingPlan } from '@/models/feeding-plan.model.js';
import { FeedingSlot } from '@/models/feeding-slot.model.js';
import { DispensingRecord } from '@/models/dispensing-record.model.js';
import { AccessSession } from '@/models/access-session.model.js';
import { DailyConsumption } from '@/models/daily-consumption.model.js';
import { DailyAccessControl } from '@/models/daily-access-control.model.js';
import { User } from '@/models/user.model.js';
import { LocalDate } from '@/helpers/local-date.vo.js';
import type { BudgetQueryResult, Id, Instant } from '@/models/types.js';

@Injectable()
export class FeedingService {
  constructor(
    @Inject(FEEDING_REPOSITORY)
    private readonly feeding: FeedingRepository,
    @Inject(PET_REPOSITORY)
    private readonly pets: PetRepository,
    private readonly devices: DeviceService,
  ) {}

  async createPlan(
    user: User,
    deviceId: Id,
    maxDailyDispensedGrams: number,
  ): Promise<FeedingPlan> {
    await this.devices.getDevice(user, deviceId);
    const existing = await this.feeding.findPlanByDevice(deviceId);
    if (existing) {
      throw new ConflictException(`Device ${deviceId} already has a feeding plan`);
    }
    const plan = FeedingPlan.create({
      id: randomUUID(),
      deviceId,
      maxDailyDispensedGrams,
    });
    await this.feeding.savePlan(plan);
    return plan;
  }

  async saveSlot(user: User, deviceId: Id, slot: FeedingSlot): Promise<number> {
    const device = await this.devices.getDevice(user, deviceId);
    const plan = await this.requirePlan(deviceId);
    if (plan.slots.some((current) => current.id === slot.id)) {
      plan.replaceSlot(slot, device.maxBowlGrams);
    } else {
      plan.addSlot(slot, device.maxBowlGrams);
    }
    await this.feeding.savePlan(plan);
    return this.devices.applyConfiguration(user, deviceId);
  }

  async removeSlot(user: User, deviceId: Id, slotId: Id): Promise<number> {
    await this.devices.getDevice(user, deviceId);
    const plan = await this.requirePlan(deviceId);
    plan.removeSlot(slotId);
    await this.feeding.savePlan(plan);
    return this.devices.applyConfiguration(user, deviceId);
  }

  async setMaxDailyDispensed(
    user: User,
    deviceId: Id,
    grams: number,
  ): Promise<number> {
    await this.devices.getDevice(user, deviceId);
    const plan = await this.requirePlan(deviceId);
    plan.setMaxDailyDispensed(grams);
    await this.feeding.savePlan(plan);
    return this.devices.applyConfiguration(user, deviceId);
  }

  async setPlanEnabled(user: User, deviceId: Id, enabled: boolean): Promise<number> {
    const device = await this.devices.getDevice(user, deviceId);
    const plan = await this.requirePlan(deviceId);
    if (enabled) {
      plan.enableScheduling(device.maxBowlGrams);
    } else {
      plan.pause();
    }
    await this.feeding.savePlan(plan);
    return this.devices.applyConfiguration(user, deviceId);
  }

  async getDispensingHistory(
    user: User,
    deviceId: Id,
    from: Instant | null,
    to: Instant | null,
  ): Promise<DispensingRecord[]> {
    await this.devices.getDevice(user, deviceId);
    return this.feeding.listDispensing(deviceId, from, to);
  }

  async getPlan(user: User, deviceId: Id): Promise<FeedingPlan | null> {
    await this.devices.getDevice(user, deviceId);
    return this.feeding.findPlanByDevice(deviceId);
  }

  async getAccessHistory(
    user: User,
    deviceId: Id,
    from: Instant | null,
    to: Instant | null,
  ): Promise<AccessSession[]> {
    await this.devices.getDevice(user, deviceId);
    return this.feeding.listAccess(deviceId, from, to);
  }

  async getDailyConsumption(
    user: User,
    deviceId: Id,
    petId: Id,
    day: LocalDate,
  ): Promise<DailyConsumption> {
    await this.devices.getDevice(user, deviceId);
    const sessions = await this.feeding.listAccessByDay(deviceId, day);
    return DailyConsumption.fromSessions(petId, deviceId, day, sessions);
  }

  async getDailyBudget(
    user: User,
    deviceId: Id,
    petId: Id,
  ): Promise<BudgetQueryResult> {
    await this.devices.getDevice(user, deviceId);
    const pet = await this.pets.findById(user.id, petId);
    if (!pet) {
      throw new NotFoundException(`Pet ${petId} not found`);
    }

    const day = LocalDate.today();
    const sessions = await this.feeding.listAccessByDay(deviceId, day);
    const consumption = DailyConsumption.fromSessions(petId, deviceId, day, sessions);
    const control = new DailyAccessControl(deviceId, day);
    const evaluation = control.evaluate(petId, pet.dailyLimitGrams, consumption);

    return {
      deviceId,
      petId,
      day,
      dailyLimitGrams: pet.dailyLimitGrams,
      consumedGrams: consumption.measuredTotal(),
      remainingGrams: evaluation.remainingGrams,
      completeMeasurements: consumption.hasCompleteMeasurements(),
    };
  }

  private async requirePlan(deviceId: Id): Promise<FeedingPlan> {
    const plan = await this.feeding.findPlanByDevice(deviceId);
    if (!plan) {
      throw new NotFoundException(`Device ${deviceId} has no feeding plan`);
    }
    return plan;
  }
}
