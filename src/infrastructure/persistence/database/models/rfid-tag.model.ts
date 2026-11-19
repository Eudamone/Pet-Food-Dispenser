import { Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { PetModel } from './pet.model.js';
import { UserModel } from './user.model.js';

/** Modelo TypeORM de la tabla `rfid_tags`. Solo persistencia. */
@Entity('rfid_tags')
@ForeignKey(() => UserModel, ['ownerId'], ['id'], { onDelete: 'RESTRICT' })
@ForeignKey(() => PetModel, ['petId'], ['id'], { onDelete: 'SET NULL' })
export class RfidTagModel {
  @PrimaryColumn('text')
  uid!: string;

  @Column('uuid')
  ownerId!: string;

  @Column({ type: 'uuid', nullable: true, unique: true })
  petId: string | null = null;

  @Column({ type: 'boolean', default: true })
  active = true;
}
