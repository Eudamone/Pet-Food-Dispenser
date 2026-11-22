import { Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import type { GateState } from '../../../../domain/entities/FeederDevice.js';
import { UserModel } from './user.model.js';

@Entity('feeders')
@ForeignKey(() => UserModel, ['ownerId'], ['id'], { onDelete: 'RESTRICT' })
export class FeederDeviceModel {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  ownerId!: string;

  @Column('varchar')
  name!: string;

  @Column('double precision')
  maxBowlGrams!: number;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
    transformer: {
      to: (ids: ReadonlySet<string>) => [...ids],
      from: (ids: string[]) => new Set(ids),
    },
  })
  authorizedPetIds: ReadonlySet<string> = new Set();

  @Column({ type: 'int', default: 0 })
  desiredRevision = 0;

  @Column({ type: 'int', default: 0 })
  appliedRevision = 0;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null = null;

  @Column({ type: 'double precision', nullable: true })
  lastBowlGrams: number | null = null;

  @Column({ type: 'text', default: 'unknown' })
  gateState: GateState = 'unknown';

  @Column({ type: 'text', nullable: true })
  lastFault: string | null = null;
}
