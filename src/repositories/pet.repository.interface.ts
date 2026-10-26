// pet.repository.interface.ts
import type { Pet } from '@/models/pet.model.js';
import type { RfidTag } from '@/models/rfid-tag.model.js';
import type { Id } from '@/models/types.js';

export interface PetRepository {
  findById(ownerId: Id, petId: Id): Promise<Pet | null>;
  listByOwner(ownerId: Id): Promise<Pet[]>;
  countByOwner(ownerId: Id): Promise<number>;
  savePet(pet: Pet): Promise<void>;

  findTag(uid: string): Promise<RfidTag | null>;
  getActiveTag(petId: Id): Promise<RfidTag | null>;
  listTagsByOwner(ownerId: Id): Promise<RfidTag[]>;
  replaceAssignment(ownerId: Id, petId: Id, uid: string): Promise<void>;
  saveTag(tag: RfidTag): Promise<void>;
}

export const PET_REPOSITORY = Symbol('PetRepository');
