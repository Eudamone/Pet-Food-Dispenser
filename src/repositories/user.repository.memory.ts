// user.repository.memory.ts
import { Injectable, Optional } from '@nestjs/common';
import { UserRepository } from '@/repositories/user.repository.interface.js';
import { InMemoryStorageClient } from '@/repositories/storage.client.js';
import type { StorageClient } from '@/repositories/storage.client.js';
import type { User } from '@/models/user.model.js';
import type { Id } from '@/models/types.js';

const COLLECTION = 'users';

@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly store: StorageClient;

  constructor(@Optional() store: StorageClient = new InMemoryStorageClient()) {
    this.store = store;
  }

  async findById(userId: Id): Promise<User | null> {
    return this.store.get<User>(COLLECTION, userId);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    const users = await this.store.list<User>(COLLECTION);
    return users.find((user) => user.email.value === normalized) ?? null;
  }

  async save(user: User): Promise<void> {
    await this.store.set<User>(COLLECTION, user.id, user);
  }
}
