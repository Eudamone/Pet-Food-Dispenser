// feeder-device.entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { GateState } from '@/models/types.js';
import type { ConfigurationData } from '@/models/configuration.model.js';

@Entity('feeder_devices')
export class FeederDeviceOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  ownerId: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  authorizedPetIds: string[];

  @Column({ type: 'double precision', default: 0 })
  maxBowlGrams: number;

  @Column({ type: 'int', default: 0 })
  desiredRevision: number;

  @Column({ type: 'int', default: 0 })
  appliedRevision: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ type: 'double precision', nullable: true })
  lastBowlGrams: number | null;

  @Column({ type: 'varchar', default: GateState.UNKNOWN })
  gateState: GateState;

  @Column({ type: 'varchar', nullable: true })
  lastFault: string | null;

  @Column({ type: 'jsonb', nullable: true })
  desiredConfiguration: ConfigurationData | null;

  @Column({ type: 'jsonb', nullable: true })
  appliedConfiguration: ConfigurationData | null;
}
