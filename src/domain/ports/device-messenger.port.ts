import type { PendingPlan } from '../repositories/device.repository.js';

export const DEVICE_MESSENGER = Symbol('DEVICE_MESSENGER');

export type FeedingPlanCommand = PendingPlan & { kind: 'feedingPlan' };

export type ManualDispenseCommand = {
  kind: 'manualDispense';
  requestId: string;
  deviceId: string;
  targetGrams: number;
  requestedAt: string;
};

export interface DeviceMessenger {
  readonly connected: boolean;
  sendConfiguration(deviceId: string, command: FeedingPlanCommand): void;
  sendManualDispense?(deviceId: string, command: ManualDispenseCommand): void;
  confirmResults(deviceId: string, eventIds: readonly string[]): void;
}
