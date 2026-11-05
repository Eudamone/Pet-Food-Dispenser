import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { UserOrmEntity } from './user.entity.js';
import { PetOrmEntity } from './pet.entity.js';

@Entity('rfid_tags')
export class RfidTagOrmEntity {
  @PrimaryColumn('text')
  uid: string;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<UserOrmEntity>;

  @Column({ type: 'uuid', nullable: true, unique: true })
  petId: string | null;

  @ManyToOne(() => PetOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'petId' })
  pet: Relation<PetOrmEntity> | null;

  @Column({ default: true })
  active: boolean;
}
