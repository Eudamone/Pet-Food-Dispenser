import { Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { UserModel } from './user.model.js';

@Entity('local_credentials')
@ForeignKey(() => UserModel, ['userId'], ['id'], { onDelete: 'CASCADE' })
export class LocalCredentialModel {
  @PrimaryColumn({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column('text')
  passwordHash: string;
}
