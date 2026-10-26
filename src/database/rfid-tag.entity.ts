// rfid-tag.entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('rfid_tags')
export class RfidTagOrmEntity {
  @PrimaryColumn()
  uid: string;

  @Column('uuid')
  ownerId: string;

  @Column({ type: 'uuid', nullable: true })
  petId: string | null;

  @Column({ default: true })
  active: boolean;
}
