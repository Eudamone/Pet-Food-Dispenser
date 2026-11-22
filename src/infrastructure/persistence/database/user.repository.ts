import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from '../../../domain/entities/User.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { UserMapper } from './mappers/user.mapper.js';
import { UserModel } from './models/user.model.js';

@Injectable()
export class DatabaseUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserModel)
    private readonly store: Repository<UserModel>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.store.findOneBy({ id });
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<User> {
    await this.store.save(UserMapper.toModel(user));
    return user;
  }
}
