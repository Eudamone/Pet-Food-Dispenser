// user.entity.ts
// Relaciones por nombre de clase + `import type`: evitan ciclos ESM en runtime (docs/RELACIONES.md).
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import type { PetOrmEntity } from '@/database/pet.entity.js';
import type { FeederDeviceOrmEntity } from '@/database/feeder-device.entity.js';

@Entity('users')
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null;

  // User 1 ── OWNS ── 0..* Pet
  @OneToMany('PetOrmEntity', (pet: PetOrmEntity) => pet.owner)
  pets: PetOrmEntity[];

  // User 1 ── MANAGES ── 0..* FeederDevice
  @OneToMany('FeederDeviceOrmEntity', (device: FeederDeviceOrmEntity) => device.user)
  feederDevices: FeederDeviceOrmEntity[];
}
