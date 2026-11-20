import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FeedingPlan } from '../domain/FeedingPlan.js';
import { FeedingSlot } from '../domain/FeedingSlot.js';
import { DailyConsumption } from '../domain/DailyConsumption.js';
import type { User } from '../domain/User.js';
import type { SaveFeedingPlanDto } from '../presentation/dto/feeding.dto.js';
import { FeedingRepository } from '../repositories/feeding.repository.js';
import { DeviceService } from './device.service.js';
import { PetService } from './pet.service.js';

function planView(plan: FeedingPlan) {
  return {
    id: plan.id,
    deviceId: plan.deviceId,
    enabled: plan.enabled,
    maxDailyDispensedGrams: plan.maxDailyDispensedGrams,
    slots: plan.slots.map((slot) => ({
      id: slot.id,
      time: slot.time,
      days: slot.days,
      targetGrams: slot.targetGrams,
      enabled: slot.enabled,
    })),
  };
}

@Injectable()
export class FeedingService {
  constructor(
    private readonly plans: FeedingRepository,
    private readonly devices: DeviceService,
    private readonly pets: PetService,
  ) {}

  async getAccessHistory(user: User, deviceId: string) {
    const device = await this.devices.getDevice(user, deviceId);
    return (await this.plans.listAccess(user.id, device.id)).map((visit) => ({
      id: visit.id,
      petId: visit.petId,
      tagUid: visit.tagUid,
      accountingDay: visit.accountingDay,
      openedAt: visit.openedAt,
      closedAt: visit.closedAt,
      initialGrams: visit.initialGrams,
      finalGrams: visit.finalGrams,
      status: visit.status,
      consumedGrams: visit.consumedGrams(),
      issue: visit.issue,
    }));
  }

  async getDispensingHistory(user: User, deviceId: string) {
    const device = await this.devices.getDevice(user, deviceId);
    return (await this.plans.listDispensing(user.id, device.id)).map(
      (record) => ({
        id: record.id,
        source: record.source,
        slotId: record.slotId,
        targetGrams: record.targetGrams,
        initialGrams: record.initialGrams,
        finalGrams: record.finalGrams,
        startedAt: record.startedAt,
        finishedAt: record.finishedAt,
        status: record.status,
        dispensedGrams: record.dispensedGrams(),
        reason: record.reason,
      }),
    );
  }

  async getDailyConsumption(
    user: User,
    deviceId: string,
    petId: string,
    day: string,
  ) {
    const device = await this.devices.getDevice(user, deviceId);
    await this.pets.findOne(user, petId);
    const visits = await this.plans.listAccessByDay(
      user.id,
      device.id,
      petId,
      day,
    );
    return DailyConsumption.fromSessions(petId, device.id, day, visits);
  }

  async getPlan(user: User, deviceId: string) {
    const device = await this.devices.getDevice(user, deviceId);
    const plan = await this.plans.findPlanByDevice(user.id, device.id);
    return {
      plan: plan ? planView(plan) : null,
      desiredRevision: device.desiredRevision,
      appliedRevision: device.appliedRevision,
    };
  }

  async savePlan(user: User, deviceId: string, input: SaveFeedingPlanDto) {
    const device = await this.devices.getDevice(user, deviceId);
    const existing = await this.plans.findPlanByDevice(user.id, device.id);
    let plan: FeedingPlan;
    try {
      plan = new FeedingPlan(
        existing?.id ?? randomUUID(),
        device.id,
        input.maxDailyDispensedGrams,
      );
      for (const slot of input.slots) {
        plan.addSlot(
          new FeedingSlot(
            slot.id ?? randomUUID(),
            slot.time,
            slot.days,
            slot.targetGrams,
            slot.enabled,
          ),
          device.maxBowlGrams,
        );
      }
      if (input.enabled) plan.enableScheduling(device.maxBowlGrams);
    } catch (error) {
      if (error instanceof Error) throw new BadRequestException(error.message);
      throw error;
    }
    const revision = await this.plans.savePlan(
      user.id,
      plan,
      input.expectedRevision,
    );
    return { plan: planView(plan), ...revision };
  }
}
