import type { Pet } from '../entities/Pet.js';
import type { RfidTag } from '../entities/RfidTag.js';

export const PET_REPOSITORY = Symbol('PET_REPOSITORY');

export interface PetRepository {
  findById(ownerId: string, petId: string): Promise<Pet | null>;
  listByOwner(ownerId: string): Promise<Pet[]>;
  countByOwner(ownerId: string): Promise<number>;
  savePet(pet: Pet): Promise<Pet>;
  delete(ownerId: string, petId: string): Promise<void>;
  findTag(ownerId: string, uid: string): Promise<RfidTag | null>;
  listTagsByOwner(ownerId: string): Promise<RfidTag[]>;
  registerTag(tag: RfidTag): Promise<RfidTag>;
  setTagActive(
    ownerId: string,
    uid: string,
    active: boolean,
  ): Promise<RfidTag>;
  unassignTag(ownerId: string, uid: string): Promise<RfidTag>;
  replaceAssignment(
    ownerId: string,
    petId: string,
    uid: string,
  ): Promise<RfidTag>;
}
