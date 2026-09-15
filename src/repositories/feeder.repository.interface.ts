import { Feeder } from '@/entity-model/feeder.model.js';

export interface IFeederRepository {
  findById(id: string): Promise<Feeder | null>;
  findAll(): Promise<Feeder[]>;
  save(feeder: Feeder): Promise<Feeder>;
  delete(id: string): Promise<void>;
}

export const FEEDER_REPOSITORY = Symbol('IFeederRepository');
