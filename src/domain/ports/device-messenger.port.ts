import type { PendingPlan } from '../repositories/device.repository.js';

export const DEVICE_MESSENGER = Symbol('DEVICE_MESSENGER');

/** Comando de configuración enviado al firmware por MQTT. */
export type FeedingPlanCommand = PendingPlan & { kind: 'feedingPlan' };

/** Comando de dispensación manual enviado al firmware por MQTT. */
export type ManualDispenseCommand = {
  kind: 'manualDispense';
  requestId: string;
  deviceId: string;
  targetGrams: number;
  requestedAt: string;
};

/**
 * Puerto de salida hacia el alimentador (MQTT). La implementación vive en
 * infrastructure/messaging; el dominio solo conoce este contrato.
 */
export interface DeviceMessenger {
  /** true cuando el enlace MQTT está establecido y puede publicar. */
  readonly connected: boolean;
  sendConfiguration(deviceId: string, command: FeedingPlanCommand): void;
  sendManualDispense?(deviceId: string, command: ManualDispenseCommand): void;
  confirmResults(deviceId: string, eventIds: readonly string[]): void;
}
