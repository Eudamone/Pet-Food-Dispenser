// dispense-request.entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { DispenseRequestStatus } from '@/models/dispense-request.model.js';

@Entity('dispense_requests')
export class DispenseRequestOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  @Column({ type: 'double precision' })
  targetGrams: number;

  @Column({ type: 'timestamptz' })
  requestedAt: Date;

  @Column({ type: 'varchar', default: DispenseRequestStatus.PENDING })
  status: DispenseRequestStatus;
}
