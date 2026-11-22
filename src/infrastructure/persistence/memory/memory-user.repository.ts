import { Injectable } from '@nestjs/common';
import type { User } from '../../../domain/entities/User.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { MemoryDatabase } from './memory.database.js';

@Injectable()
export class MemoryUserRepository implements UserRepository {
  constructor(private readonly db: MemoryDatabase) {}

  async findById(id: string): Promise<User | null> {
    return this.db.users.get(id) ?? null;
  }

  async save(user: User): Promise<User> {
    this.db.users.set(user.id, user);
    return user;
  }
}
