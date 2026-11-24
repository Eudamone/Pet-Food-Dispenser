import type { FeederDevice, GateState } from '../entities/FeederDevice.js';

export const DEVICE_REPOSITORY = Symbol('DEVICE_REPOSITORY');

export type AuthorizedPetConfig = {
  petId: string;
  tagUid: string | null;
  dailyLimitGrams: number | null;
};

export type PendingPlan = {
  deviceId: string;
  revision: number;
  maxBowlGrams: number;
  enabled: boolean;
  maxDailyDispensedGrams: number;
  foodOpenSeconds: number;
  slots: object[];
  authorizedPetIds?: string[];
  authorizedPets?: AuthorizedPetConfig[];
};

export interface DeviceRepository {
  exists(id: string): Promise<boolean>;
  requireDevice(id: string): Promise<void>;
  pendingPlans(): Promise<PendingPlan[]>;
  confirmPlan(id: string, revision: number): Promise<void>;
  saveObservedState(
    id: string,
    at: Date,
    gate: GateState,
    fault: string | null,
  ): Promise<void>;
  findById(ownerId: string, id: string): Promise<FeederDevice | null>;
  listByOwner(ownerId: string): Promise<FeederDevice[]>;
  create(device: FeederDevice): Promise<FeederDevice>;
  saveDevice(device: FeederDevice): Promise<FeederDevice>;
  delete(ownerId: string, id: string): Promise<void>;
}
