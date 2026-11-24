import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from '../../../domain/entities/User.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { UserMapper } from './mappers/user.mapper.js';
import { LocalCredentialModel } from './models/local-credential.model.js';
import { UserModel } from './models/user.model.js';

@Injectable()
export class DatabaseUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserModel)
    private readonly store: Repository<UserModel>,
  ) {}

  async findLocalCredentials(email: string) {
    const row = await this.store.manager.findOneBy(LocalCredentialModel, {
      email,
    });
    return row ? { userId: row.userId, passwordHash: row.passwordHash } : null;
  }

  async createLocalUser(user: User, passwordHash: string): Promise<User> {
    try {
      await this.store.manager.transaction(async (manager) => {
        await manager.insert(UserModel, UserMapper.toModel(user));
        await manager.insert(LocalCredentialModel, {
          email: user.email,
          userId: user.id,
          passwordHash,
        });
      });
      return user;
    } catch (error) {
      if (
        (error as { driverError?: { code?: string } }).driverError?.code ===
        '23505'
      )
        throw new ConflictException('Ese correo ya está registrado.');
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.store.findOneBy({ id });
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<User> {
    await this.store.save(UserMapper.toModel(user));
    return user;
  }
}
