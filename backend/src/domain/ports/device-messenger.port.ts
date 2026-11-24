import type { PendingPlan } from '../repositories/device.repository.js';

export const DEVICE_MESSENGER = Symbol('DEVICE_MESSENGER');

export type FeedingPlanCommand = PendingPlan & {
  kind: 'feedingPlan';
  sentAt?: string;
};

export type ManualDispenseCommand = {
  kind: 'manualDispense';
  requestId: string;
  deviceId: string;
  targetGrams: number;
  requestedAt: string;
};

export const SERVOS = ['access', 'food'] as const;
export const SERVO_POSITIONS = ['open', 'closed'] as const;
export type ServoName = (typeof SERVOS)[number];
export type ServoPosition = (typeof SERVO_POSITIONS)[number];

export type ServoCommand = {
  kind: 'servoPosition';
  requestId: string;
  deviceId: string;
  servo: ServoName;
  position: ServoPosition;
  requestedAt: string;
};

export interface DeviceMessenger {
  readonly connected: boolean;
  sendConfiguration(deviceId: string, command: FeedingPlanCommand): void;
  sendManualDispense?(deviceId: string, command: ManualDispenseCommand): void;
  sendServoPosition?(deviceId: string, command: ServoCommand): void;
  confirmResults(deviceId: string, eventIds: readonly string[]): void;
}
