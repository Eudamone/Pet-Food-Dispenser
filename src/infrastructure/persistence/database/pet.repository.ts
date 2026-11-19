import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { Pet } from '../../../domain/entities/Pet.js';
import type { RfidTag } from '../../../domain/entities/RfidTag.js';
import type { PetRepository } from '../../../domain/repositories/pet.repository.js';
import { PetMapper } from './mappers/pet.mapper.js';
import { RfidTagMapper } from './mappers/rfid-tag.mapper.js';
import { PetModel } from './models/pet.model.js';
import { RfidTagModel } from './models/rfid-tag.model.js';
import { UserModel } from './models/user.model.js';

/** Adaptador de persistencia de mascotas y tags sobre PostgreSQL. */
@Injectable()
export class DatabasePetRepository implements PetRepository {
  constructor(
    @InjectRepository(PetModel)
    private readonly store: Repository<PetModel>,
    @InjectRepository(RfidTagModel)
    private readonly tags: Repository<RfidTagModel>,
    private readonly database: DataSource,
  ) {}

  async findById(ownerId: string, petId: string): Promise<Pet | null> {
    const row = await this.store.findOneBy({ id: petId, ownerId });
    return row ? PetMapper.toDomain(row) : null;
  }

  async listByOwner(ownerId: string): Promise<Pet[]> {
    const rows = await this.store.find({
      where: { ownerId },
      order: { name: 'ASC' },
    });
    return rows.map((row) => PetMapper.toDomain(row));
  }

  countByOwner(ownerId: string): Promise<number> {
    return this.store.countBy({ ownerId });
  }

  async savePet(pet: Pet): Promise<Pet> {
    await this.store.save(PetMapper.toModel(pet));
    return pet;
  }

  async delete(ownerId: string, petId: string): Promise<void> {
    const result = await this.store.delete({ id: petId, ownerId });
    if (!result.affected)
      throw new NotFoundException('No se encontró la mascota.');
  }

  async findTag(ownerId: string, uid: string): Promise<RfidTag | null> {
    const row = await this.tags.findOneBy({ uid, ownerId });
    return row ? RfidTagMapper.toDomain(row) : null;
  }

  async listTagsByOwner(ownerId: string): Promise<RfidTag[]> {
    const rows = await this.tags.find({
      where: { ownerId },
      order: { uid: 'ASC' },
    });
    return rows.map((row) => RfidTagMapper.toDomain(row));
  }

  async registerTag(tag: RfidTag): Promise<RfidTag> {
    try {
      await this.tags.insert(RfidTagMapper.toModel(tag));
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
      const owner = await manager.findOne(UserModel, {
        where: { id: ownerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!owner) throw new NotFoundException('No se encontró el perfil.');

      const pet = await manager.findOneBy(PetModel, { id: petId, ownerId });
      const row = await manager.findOneBy(RfidTagModel, { uid, ownerId });
      if (!pet || !row) {
        throw new NotFoundException(
          'La mascota o el tag no pertenecen a tu cuenta.',
        );
      }

      await manager.update(
        RfidTagModel,
        [
          { ownerId, petId },
          { ownerId, uid },
        ],
        { petId: null },
      );

      const tag = RfidTagMapper.toDomain(row);
      tag.unassign();
      tag.assignTo(petId);
      await manager.update(
        RfidTagModel,
        { ownerId, uid },
        { petId: tag.petId },
      );
      const saved = await manager.findOneBy(RfidTagModel, { ownerId, uid });
      return RfidTagMapper.toDomain(saved!);
    });
  }
}
