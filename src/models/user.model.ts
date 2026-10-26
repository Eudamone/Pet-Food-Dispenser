// user.model.ts
import { Email } from '@/helpers/email.vo.js';
import { Credential } from '@/helpers/credential.vo.js';
import type { Id } from '@/models/types.js';

export class User {
  constructor(
    public readonly id: Id,
    public name: string,
    public email: Email,
    public password: Credential | null = null,
  ) {}

  static create(props: {
    id: Id;
    name: string;
    email: string;
    password?: Credential | null;
  }): User {
    return new User(
      props.id,
      props.name,
      Email.create(props.email),
      props.password ?? null,
    );
  }

  rename(name: string): void {
    this.name = name;
  }

  applyVerifiedEmail(email: string): void {
    this.email = Email.create(email);
  }

  owns(ownerId: Id): boolean {
    return this.id === ownerId;
  }
}
