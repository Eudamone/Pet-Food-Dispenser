import { Email } from '@/helpers/email.vo.js';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly name: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: { id: string; email: string; name: string }): User {
    const emailVO = Email.create(props.email);
    const now = new Date();

    return new User(props.id, emailVO, props.name, true, now, now);
  }

  updateName(newName: string): User {
    return new User(
      this.id,
      this.email,
      newName,
      this.isActive,
      this.createdAt,
      new Date(),
    );
  }

  deactivate(): User {
    return new User(
      this.id,
      this.email,
      this.name,
      false,
      this.createdAt,
      new Date(),
    );
  }

  activate(): User {
    return new User(
      this.id,
      this.email,
      this.name,
      true,
      this.createdAt,
      new Date(),
    );
  }
}