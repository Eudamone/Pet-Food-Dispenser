import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pet } from '../domain/Pet.js';
import { RfidTag } from '../domain/RfidTag.js';
import { User } from '../domain/User.js';

@Injectable()
export class PetRepository {
  constructor(
    @InjectRepository(Pet)
    private readonly store: Repository<Pet>,
    @InjectRepository(RfidTag)
    private readonly tags: Repository<RfidTag>,
    private readonly database: DataSource,
  ) {}

  async findById(ownerId: string, petId: string): Promise<Pet | null> {
    const row = await this.store.findOneBy({ id: petId, ownerId });
    return row;
  }

  async listByOwner(ownerId: string): Promise<Pet[]> {
    return this.store.find({ where: { ownerId }, order: { name: 'ASC' } });
  }

  countByOwner(ownerId: string): Promise<number> {
    return this.store.countBy({ ownerId });
  }

  async savePet(pet: Pet): Promise<Pet> {
    return this.store.save(pet);
  }

  async delete(ownerId: string, petId: string): Promise<void> {
    const result = await this.store.delete({ id: petId, ownerId });
    if (!result.affected)
      throw new NotFoundException('No se encontró la mascota.');
  }

  async findTag(ownerId: string, uid: string): Promise<RfidTag | null> {
    const row = await this.tags.findOneBy({ uid, ownerId });
    return row;
  }

  async listTagsByOwner(ownerId: string): Promise<RfidTag[]> {
    return this.tags.find({ where: { ownerId }, order: { uid: 'ASC' } });
  }

  async registerTag(tag: RfidTag): Promise<RfidTag> {
    try {
      await this.tags.insert(tag);
      return tag;
    } catch (error) {
      if (
        (error as { driverError?: { code?: string } }).driverError?.code ===
        '23505'
      ) {
        throw new ConflictException('El tag ya está registrado.');
      }
      throw error;
    }
  }

  async setTagActive(
    ownerId: string,
    uid: string,
    active: boolean,
  ): Promise<RfidTag> {
    const result = await this.tags.update({ ownerId, uid }, { active });
    if (!result.affected) throw new NotFoundException('No se encontró el tag.');
    return (await this.findTag(ownerId, uid))!;
  }

  async unassignTag(ownerId: string, uid: string): Promise<RfidTag> {
    const result = await this.tags.update({ ownerId, uid }, { petId: null });
    if (!result.affected) throw new NotFoundException('No se encontró el tag.');
    return (await this.findTag(ownerId, uid))!;
  }

  replaceAssignment(
    ownerId: string,
    petId: string,
    uid: string,
  ): Promise<RfidTag> {
    return this.database.transaction(async (manager) => {
      const owner = await manager.findOne(User, {
        where: { id: ownerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!owner) throw new NotFoundException('No se encontró el perfil.');

      const pet = await manager.findOneBy(Pet, { id: petId, ownerId });
      const row = await manager.findOneBy(RfidTag, { uid, ownerId });
      if (!pet || !row) {
        throw new NotFoundException(
          'La mascota o el tag no pertenecen a tu cuenta.',
        );
      }

      await manager.update(
        RfidTag,
        [
          { ownerId, petId },
          { ownerId, uid },
        ],
        { petId: null },
      );

      const tag = row;
      tag.unassign();
      tag.assignTo(petId);
      await manager.update(RfidTag, { ownerId, uid }, { petId: tag.petId });
      const saved = await manager.findOneBy(RfidTag, { ownerId, uid });
      return saved!;
    });
  }
}
