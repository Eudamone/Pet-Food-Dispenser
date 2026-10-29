// rfid-tag.entity.ts
// Relaciones por nombre de clase + `import type`: evitan ciclos ESM en runtime (docs/RELACIONES.md).
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import type { UserOrmEntity } from '@/database/user.entity.js';
import type { PetOrmEntity } from '@/database/pet.entity.js';
import type { AccessSessionOrmEntity } from '@/database/access-session.entity.js';

@Entity('rfid_tags')
export class RfidTagOrmEntity {
  @PrimaryColumn()
  uid: string;

  @Column('uuid')
  ownerId: string;

  // El tag pertenece al usuario que lo registró (el diagrama no nombra esta
  // relación, pero ownerId es una FK a users).
  @ManyToOne('UserOrmEntity')
  @JoinColumn({ name: 'ownerId' })
  owner: UserOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  petId: string | null;

  // Pet 1 ── HAS (Agregación) ── 0..1 RfidTag. Este lado es el dueño de la FK:
  // la restricción única de la columna garantiza a lo más un tag por mascota.
  @OneToOne('PetOrmEntity', (pet: PetOrmEntity) => pet.tag, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'petId' })
  pet: PetOrmEntity | null;

  @Column({ default: true })
  active: boolean;

  // RfidTag 1 ── IDENTIFIES ── 0..* AccessSession
  @OneToMany('AccessSessionOrmEntity', (session: AccessSessionOrmEntity) => session.tag)
  accessSessions: AccessSessionOrmEntity[];
}
