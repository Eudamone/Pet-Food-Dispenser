import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeederOrmEntity } from '@/entity-model/feeder.entity.js';
import { Feeder } from '@/entity-model/feeder.model.js';
import { IFeederRepository } from '@/repositories/feeder.repository.interface.js';

@Injectable()
export class TypeOrmFeederRepository implements IFeederRepository {
  constructor(
    @InjectRepository(FeederOrmEntity)
    private readonly repository: Repository<FeederOrmEntity>,
  ) {}

  async findById(id: string): Promise<Feeder | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<Feeder[]> {
    return (await this.repository.find()).map((entity) => this.toDomain(entity));
  }

  async save(feeder: Feeder): Promise<Feeder> {
    return this.toDomain(await this.repository.save(this.toOrmEntity(feeder)));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toDomain(entity: FeederOrmEntity): Feeder {
    return new Feeder(
      entity.id,
      entity.userId,
      entity.name,
      entity.petId,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private toOrmEntity(feeder: Feeder): FeederOrmEntity {
    return Object.assign(new FeederOrmEntity(), feeder);
  }
}
