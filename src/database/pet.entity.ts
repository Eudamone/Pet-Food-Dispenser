// pet.entity.ts
// Relaciones por nombre de clase + `import type`: evitan ciclos ESM en runtime (docs/RELACIONES.md).
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import type { UserOrmEntity } from '@/database/user.entity.js';
import type { RfidTagOrmEntity } from '@/database/rfid-tag.entity.js';

@Entity('pets')
export class PetOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  ownerId: string;

  // User 1 ── OWNS ── 0..* Pet
  @ManyToOne('UserOrmEntity', (user: UserOrmEntity) => user.pets)
  @JoinColumn({ name: 'ownerId' })
  owner: UserOrmEntity;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  species: string | null;

  @Column({ type: 'double precision', nullable: true })
  dailyLimitGrams: number | null;

  @Column({ type: 'int', nullable: true })
  birthYear: number | null;

  @Column({ type: 'int', nullable: true })
  birthMonth: number | null;

  @Column({ type: 'int', nullable: true })
  birthDay: number | null;

  // Pet 1 ── HAS (Agregación) ── 0..1 RfidTag (lado inverso: la FK la posee el tag)
  @OneToOne('RfidTagOrmEntity', (tag: RfidTagOrmEntity) => tag.pet)
  tag: RfidTagOrmEntity;

  // La ligación mascota↔comedero (1-1) vive en feeder_devices.petId: el
  // comedero es quien declara a qué mascota sirve (lado dueño de la FK).
}
