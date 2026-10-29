// dispense-request.entity.ts
// Relaciones por nombre de clase + `import type`: evitan ciclos ESM en runtime (docs/RELACIONES.md).
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DispenseRequestStatus } from '@/models/dispense-request.model.js';
import type { FeederDeviceOrmEntity } from '@/database/feeder-device.entity.js';

@Entity('dispense_requests')
export class DispenseRequestOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  // Cada solicitud de dispensado manual pertenece a un comedero (1..*).
  @ManyToOne('FeederDeviceOrmEntity')
  @JoinColumn({ name: 'deviceId' })
  device: FeederDeviceOrmEntity;

  @Column({ type: 'double precision' })
  targetGrams: number;

  @Column({ type: 'timestamptz' })
  requestedAt: Date;

  @Column({ type: 'varchar', default: DispenseRequestStatus.PENDING })
  status: DispenseRequestStatus;
}
