import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
export class User {
  private _id: string;

  private _name: string;
  private _email: string;

  constructor(id: string, name: string, email: string) {
    const cleanId = id.trim();

    if (cleanId === '') {
      throw new Error('El usuario necesita un identificador.');
    }

    this._id = cleanId;
    this._name = User.validateName(name);
    this._email = User.validateEmail(email);
  }

  @PrimaryColumn('uuid')
  get id(): string {
    return this._id;
  }

  private set id(value: string) {
    this._id = value;
  }

  @Column('varchar')
  get name(): string {
    return this._name;
  }

  private set name(value: string) {
    this._name = value;
  }

  @Column('varchar')
  get email(): string {
    return this._email;
  }

  private set email(value: string) {
    this._email = value;
  }

  rename(name: string): void {
    this._name = User.validateName(name);
  }

  applyVerifiedEmail(email: string): void {
    this._email = User.validateEmail(email);
  }

  owns(ownerId: string): boolean {
    return this._id === ownerId;
  }

  private static validateName(name: string): string {
    const cleanName = name.trim();

    if (cleanName === '') {
      throw new Error('El nombre no puede estar vacío.');
    }

    return cleanName;
  }

  private static validateEmail(email: string): string {
    const cleanEmail = email.trim();

    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!pattern.test(cleanEmail)) {
      throw new Error('El correo no tiene un formato válido.');
    }

    return cleanEmail;
  }
}
