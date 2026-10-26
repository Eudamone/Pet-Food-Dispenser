// user.repository.interface.ts
import type { User } from '@/models/user.model.js';
import type { Id } from '@/models/types.js';

export interface UserRepository {
  findById(userId: Id): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('UserRepository');
