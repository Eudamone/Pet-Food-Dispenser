import type { User } from '../entities/User.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export type LocalCredentials = { userId: string; passwordHash: string };

export interface UserRepository {
  findLocalCredentials(email: string): Promise<LocalCredentials | null>;
  createLocalUser(user: User, passwordHash: string): Promise<User>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}
