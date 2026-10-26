// configuration.model.ts
// Datos de configuración que el backend envía al comedero.

import type { FeederDevice } from '@/models/feeder-device.model.js';
import type { FeedingPlan } from '@/models/feeding-plan.model.js';
import type { Id } from '@/models/types.js';

export interface FeedingSlotConfiguration {
  id: Id;
  time: string;
  days: string[];
  targetGrams: number;
  enabled: boolean;
}

export interface FeedingPlanConfiguration {
  enabled: boolean;
  maxDailyDispensedGrams: number;
  slots: FeedingSlotConfiguration[];
}

export interface ConfigurationData {
  deviceId: Id;
  revision: number;
  maxBowlGrams: number;
  authorizedPetIds: Id[];
  plan: FeedingPlanConfiguration | null;
}

// Construye la configuración a partir del estado del comedero y su plan.
export function buildConfigurationData(
  device: FeederDevice,
  plan: FeedingPlan | null,
  revision: number,
): ConfigurationData {
  return {
    deviceId: device.id,
    revision,
    maxBowlGrams: device.maxBowlGrams,
    authorizedPetIds: [...device.authorizedPetIds],
    plan: plan
      ? {
          enabled: plan.enabled,
          maxDailyDispensedGrams: plan.maxDailyDispensedGrams,
          slots: plan.slots.map((slot) => ({
            id: slot.id,
            time: slot.time.toString(),
            days: slot.days,
            targetGrams: slot.targetGrams,
            enabled: slot.enabled,
          })),
        }
      : null,
  };
}
