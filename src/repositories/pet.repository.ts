// pet.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetRepository } from '@/repositories/pet.repository.interface.js';
import { PetOrmEntity } from '@/database/pet.entity.js';
import { RfidTagOrmEntity } from '@/database/rfid-tag.entity.js';
import { Pet } from '@/models/pet.model.js';
import { RfidTag } from '@/models/rfid-tag.model.js';
import type { Id } from '@/models/types.js';

@Injectable()
export class TypeOrmPetRepository implements PetRepository {
  constructor(
    @InjectRepository(PetOrmEntity)
    private readonly pets: Repository<PetOrmEntity>,
    @InjectRepository(RfidTagOrmEntity)
    private readonly tags: Repository<RfidTagOrmEntity>,
  ) {}

  async findById(ownerId: Id, petId: Id): Promise<Pet | null> {
    const entity = await this.pets.findOne({ where: { id: petId, ownerId } });
    return entity ? this.toDomain(entity) : null;
  }

  async listByOwner(ownerId: Id): Promise<Pet[]> {
    return (await this.pets.find({ where: { ownerId } })).map((entity) =>
      this.toDomain(entity),
    );
  }

  async countByOwner(ownerId: Id): Promise<number> {
    return this.pets.count({ where: { ownerId } });
  }

  async savePet(pet: Pet): Promise<void> {
    await this.pets.save(this.toOrmEntity(pet));
  }

  async findTag(uid: string): Promise<RfidTag | null> {
    const entity = await this.tags.findOne({ where: { uid } });
    return entity ? this.tagToDomain(entity) : null;
  }

  async getActiveTag(petId: Id): Promise<RfidTag | null> {
    const entity = await this.tags.findOne({ where: { petId, active: true } });
    return entity ? this.tagToDomain(entity) : null;
  }

  async listTagsByOwner(ownerId: Id): Promise<RfidTag[]> {
    return (await this.tags.find({ where: { ownerId } })).map((entity) =>
      this.tagToDomain(entity),
    );
  }

  async replaceAssignment(ownerId: Id, petId: Id, uid: string): Promise<void> {
    await this.tags.update({ ownerId, petId }, { petId: null });
    await this.tags.update({ ownerId, uid }, { petId, active: true });
  }

  async saveTag(tag: RfidTag): Promise<void> {
    const entity = new RfidTagOrmEntity();
    entity.uid = tag.uid;
    entity.ownerId = tag.ownerId;
    entity.petId = tag.petId;
    entity.active = tag.active;
    await this.tags.save(entity);
  }

  private toDomain(entity: PetOrmEntity): Pet {
    return new Pet(
      entity.id,
      entity.ownerId,
      entity.name,
      entity.species,
      entity.dailyLimitGrams,
      entity.birthYear,
      entity.birthMonth,
      entity.birthDay,
    );
  }

  private toOrmEntity(pet: Pet): PetOrmEntity {
    const entity = new PetOrmEntity();
    entity.id = pet.id;
    entity.ownerId = pet.ownerId;
    entity.name = pet.name;
    entity.species = pet.species;
    entity.dailyLimitGrams = pet.dailyLimitGrams;
    entity.birthYear = pet.birthYear;
    entity.birthMonth = pet.birthMonth;
    entity.birthDay = pet.birthDay;
    return entity;
  }

  private tagToDomain(entity: RfidTagOrmEntity): RfidTag {
    return new RfidTag(entity.uid, entity.ownerId, entity.petId, entity.active);
  }
}
