import { Pet } from '@/entity-model/pet.model.js';

export interface IPetRepository {
  findById(id: string): Promise<Pet | null>;
  findAll(): Promise<Pet[]>;
  save(pet: Pet): Promise<Pet>;
  delete(id: string): Promise<void>;
}

export const PET_REPOSITORY = Symbol('IPetRepository');
