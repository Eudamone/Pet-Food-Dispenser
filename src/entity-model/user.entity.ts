// user.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { FeederOrmEntity } from '@/entity-model/feeder.entity.js';
import type { PetOrmEntity } from '@/entity-model/pet.entity.js';

@Entity('users')
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('FeederOrmEntity', (feeder: FeederOrmEntity) => feeder.user)
  feeders: FeederOrmEntity[];

  @OneToMany('PetOrmEntity', (pet: PetOrmEntity) => pet.user)
  pets: PetOrmEntity[];
}
