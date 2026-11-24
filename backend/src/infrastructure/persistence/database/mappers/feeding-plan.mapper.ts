import { FeedingPlan } from '../../../../domain/entities/FeedingPlan.js';
import { FeedingPlanModel } from '../models/feeding-plan.model.js';

export class FeedingPlanMapper {
  static toDomain(row: FeedingPlanModel): FeedingPlan {
    const plan = new FeedingPlan(
      row.id,
      row.deviceId,
      row.maxDailyDispensedGrams || null,
      row.maxDailyOpenSeconds,
    );
    for (const slot of row.slots) plan.addSlot(slot, Number.MAX_SAFE_INTEGER);
    if (row.enabled) plan.enableScheduling(Number.MAX_SAFE_INTEGER);
    return plan;
  }

  static toModel(plan: FeedingPlan): FeedingPlanModel {
    const row = new FeedingPlanModel();
    row.id = plan.id;
    row.deviceId = plan.deviceId;
    row.slots = [...plan.slots];
    row.enabled = plan.enabled;
    row.maxDailyDispensedGrams = plan.maxDailyDispensedGrams;
    row.maxDailyOpenSeconds = plan.maxDailyOpenSeconds;
    row.foodOpenSeconds = plan.foodOpenSeconds;
    return row;
  }
}
