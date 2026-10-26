// user.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from '@/repositories/user.repository.interface.js';
import { UserOrmEntity } from '@/database/user.entity.js';
import { User } from '@/models/user.model.js';
import { Email } from '@/helpers/email.vo.js';
import { Credential } from '@/helpers/credential.vo.js';
import type { Id } from '@/models/types.js';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repository: Repository<UserOrmEntity>,
  ) {}

  async findById(userId: Id): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id: userId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async save(user: User): Promise<void> {
    await this.repository.save(this.toOrmEntity(user));
  }

  private toDomain(entity: UserOrmEntity): User {
    return new User(
      entity.id,
      entity.name,
      Email.create(entity.email),
      entity.passwordHash ? Credential.fromHash(entity.passwordHash) : null,
    );
  }

  private toOrmEntity(user: User): UserOrmEntity {
    const entity = new UserOrmEntity();
    entity.id = user.id;
    entity.name = user.name;
    entity.email = user.email.value;
    entity.passwordHash = user.password?.hash ?? null;
    return entity;
  }
}
