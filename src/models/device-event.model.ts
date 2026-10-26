// device-event.model.ts
// Eventos que el comedero reporta al backend.

import type { Id, Instant } from '@/models/types.js';

export enum DeviceEventType {
  CONFIGURATION_APPLIED = 'CONFIGURATION_APPLIED',
  DISPENSE_COMPLETED = 'DISPENSE_COMPLETED',
  DISPENSE_FAILED = 'DISPENSE_FAILED',
  ACCESS_OPENED = 'ACCESS_OPENED',
  ACCESS_CLOSED = 'ACCESS_CLOSED',
  STATE_OBSERVED = 'STATE_OBSERVED',
}

export interface DeviceEvent {
  id: Id;
  deviceId: Id;
  type: DeviceEventType;
  occurredAt: Instant;
  payload: Record<string, unknown>;
}
