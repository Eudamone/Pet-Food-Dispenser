import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IUserRepository } from '@/repositories/user.repository.interface.js';
import { UserOrmEntity } from '@/entity-model/user.entity.js';
import { Repository } from 'typeorm';
import { User } from '@/entity-model/user.model.js';
import { Email } from '@/helpers/email.vo.js';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repository: Repository<UserOrmEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<User[]> {
    const entities = await this.repository.find();
    return entities.map((entity) => this.toDomain(entity));
  }

  async save(user: User): Promise<User> {
    const entity = this.toOrmEntity(user);
    const savedEntity = await this.repository.save(entity);
    return this.toDomain(savedEntity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(email: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email } });
    return count > 0;
  }

  // Mapping methods - convert between domain and ORM entities
  private toDomain(entity: UserOrmEntity): User {
    return new User(
      entity.id,
      Email.create(entity.email),
      entity.name,
      entity.isActive,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private toOrmEntity(user: User): UserOrmEntity {
    const entity = new UserOrmEntity();
    entity.id = user.id;
    entity.email = user.email.value;
    entity.name = user.name;
    entity.isActive = user.isActive;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;
    return entity;
  }
}