import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pet } from '../../../domain/entities/Pet.js';
import type { RfidTag } from '../../../domain/entities/RfidTag.js';
import type { PetRepository } from '../../../domain/repositories/pet.repository.js';
import { MemoryDatabase } from './memory.database.js';

/** Repositorio de mascotas y tags en memoria (desarrollo y pruebas). */
@Injectable()
export class MemoryPetRepository implements PetRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async findById(ownerId: string, petId: string): Promise<Pet | null> {
    return this.db.pets.get(this.db.petKey(ownerId, petId)) ?? null;
  }

  async listByOwner(ownerId: string): Promise<Pet[]> {
    return [...this.db.pets.values()]
      .filter((pet) => pet.ownerId === ownerId)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async countByOwner(ownerId: string): Promise<number> {
    return (await this.listByOwner(ownerId)).length;
  }

  async savePet(pet: Pet): Promise<Pet> {
    this.db.pets.set(this.db.petKey(pet.ownerId, pet.id), pet);
    return pet;
  }

  async delete(ownerId: string, petId: string): Promise<void> {
    if (!this.db.pets.delete(this.db.petKey(ownerId, petId)))
      throw new NotFoundException('No se encontró la mascota.');
  }

  async findTag(ownerId: string, uid: string): Promise<RfidTag | null> {
    const tag = this.db.tags.get(uid);
    return tag && tag.ownerId === ownerId ? tag : null;
  }

  async listTagsByOwner(ownerId: string): Promise<RfidTag[]> {
    return [...this.db.tags.values()]
      .filter((tag) => tag.ownerId === ownerId)
      .sort((a, b) => a.uid.localeCompare(b.uid, 'es'));
  }

  async registerTag(tag: RfidTag): Promise<RfidTag> {
    if (this.db.tags.has(tag.uid))
      throw new ConflictException('El tag ya está registrado.');
    this.db.tags.set(tag.uid, tag);
    return tag;
  }

  async setTagActive(
    ownerId: string,
    uid: string,
    active: boolean,
  ): Promise<RfidTag> {
    const tag = await this.findTag(ownerId, uid);
    if (!tag) throw new NotFoundException('No se encontró el tag.');
    if (active) tag.activate();
    else tag.deactivate();
    return tag;
  }

  async unassignTag(ownerId: string, uid: string): Promise<RfidTag> {
    const tag = await this.findTag(ownerId, uid);
    if (!tag) throw new NotFoundException('No se encontró el tag.');
    tag.unassign();
    return tag;
  }

  async replaceAssignment(
    ownerId: string,
    petId: string,
    uid: string,
  ): Promise<RfidTag> {
    if (!this.db.pets.has(this.db.petKey(ownerId, petId))) {
      throw new NotFoundException(
        'La mascota o el tag no pertenecen a tu cuenta.',
      );
    }
    const tag = await this.findTag(ownerId, uid);
    if (!tag) {
      throw new NotFoundException(
        'La mascota o el tag no pertenecen a tu cuenta.',
      );
    }

    for (const other of this.db.tags.values())
      if (
        other.ownerId === ownerId &&
        (other.petId === petId || other.uid === uid)
      )
        other.unassign();

    tag.unassign();
    tag.assignTo(petId);
    return tag;
  }
}
