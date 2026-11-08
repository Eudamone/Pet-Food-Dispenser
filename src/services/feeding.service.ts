import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FeedingPlan } from '../domain/FeedingPlan.js';
import { FeedingSlot } from '../domain/FeedingSlot.js';
import type { User } from '../domain/User.js';
import type { SaveFeedingPlanDto } from '../presentation/dto/feeding.dto.js';
import { FeedingRepository } from '../repositories/feeding.repository.js';
import { DeviceService } from './device.service.js';

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
  ) {}

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
