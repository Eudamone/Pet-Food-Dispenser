// pet.repository.memory.ts
import { Injectable, Optional } from '@nestjs/common';
import { PetRepository } from '@/repositories/pet.repository.interface.js';
import { InMemoryStorageClient } from '@/repositories/storage.client.js';
import type { StorageClient } from '@/repositories/storage.client.js';
import type { Pet } from '@/models/pet.model.js';
import type { RfidTag } from '@/models/rfid-tag.model.js';
import type { Id } from '@/models/types.js';

const PETS = 'pets';
const TAGS = 'rfid-tags';

@Injectable()
export class InMemoryPetRepository implements PetRepository {
  private readonly store: StorageClient;

  constructor(@Optional() store: StorageClient = new InMemoryStorageClient()) {
    this.store = store;
  }

  async findById(ownerId: Id, petId: Id): Promise<Pet | null> {
    const pet = await this.store.get<Pet>(PETS, petId);
    return pet && pet.ownerId === ownerId ? pet : null;
  }

  async listByOwner(ownerId: Id): Promise<Pet[]> {
    return (await this.store.list<Pet>(PETS)).filter((pet) => pet.ownerId === ownerId);
  }

  async countByOwner(ownerId: Id): Promise<number> {
    return (await this.listByOwner(ownerId)).length;
  }

  async savePet(pet: Pet): Promise<void> {
    await this.store.set<Pet>(PETS, pet.id, pet);
  }

  async findTag(uid: string): Promise<RfidTag | null> {
    return this.store.get<RfidTag>(TAGS, uid);
  }

  async getActiveTag(petId: Id): Promise<RfidTag | null> {
    const tags = await this.store.list<RfidTag>(TAGS);
    return tags.find((tag) => tag.petId === petId && tag.active) ?? null;
  }

  async listTagsByOwner(ownerId: Id): Promise<RfidTag[]> {
    return (await this.store.list<RfidTag>(TAGS)).filter(
      (tag) => tag.ownerId === ownerId,
    );
  }

  async replaceAssignment(ownerId: Id, petId: Id, uid: string): Promise<void> {
    const tags = await this.listTagsByOwner(ownerId);
    for (const tag of tags) {
      if (tag.petId === petId && tag.uid !== uid) {
        tag.unassign();
        await this.store.set<RfidTag>(TAGS, tag.uid, tag);
      }
    }
    const target = tags.find((tag) => tag.uid === uid);
    if (target) {
      target.assignTo(petId);
      target.activate();
      await this.store.set<RfidTag>(TAGS, target.uid, target);
    }
  }

  async saveTag(tag: RfidTag): Promise<void> {
    await this.store.set<RfidTag>(TAGS, tag.uid, tag);
  }
}
