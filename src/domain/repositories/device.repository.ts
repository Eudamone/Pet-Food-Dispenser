import type { FeederDevice, GateState } from '../entities/FeederDevice.js';

export const DEVICE_REPOSITORY = Symbol('DEVICE_REPOSITORY');

/** Configuración individual de mascota autorizada para validación local en el firmware. */
export type AuthorizedPetConfig = {
  petId: string;
  tagUid: string | null;
  dailyLimitGrams: number | null;
};

/** Fila plana de un plan pendiente de confirmar por el equipo. */
export type PendingPlan = {
  deviceId: string;
  revision: number;
  maxBowlGrams: number;
  enabled: boolean;
  maxDailyDispensedGrams: number;
  slots: object[];
  authorizedPetIds?: string[];
  authorizedPets?: AuthorizedPetConfig[];
};

export interface DeviceRepository {
  requireDevice(id: string): Promise<void>;
  pendingPlans(): Promise<PendingPlan[]>;
  confirmPlan(id: string, revision: number): Promise<void>;
  saveObservedState(
    id: string,
    at: Date,
    weight: number | null,
    gate: GateState,
    fault: string | null,
  ): Promise<void>;
  findById(ownerId: string, id: string): Promise<FeederDevice | null>;
  listByOwner(ownerId: string): Promise<FeederDevice[]>;
  create(device: FeederDevice): Promise<FeederDevice>;
  saveDevice(device: FeederDevice): Promise<FeederDevice>;
  delete(ownerId: string, id: string): Promise<void>;
}
