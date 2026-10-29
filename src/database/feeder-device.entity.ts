// feeder-device.entity.ts
// Relaciones por nombre de clase + `import type`: evitan ciclos ESM en runtime (docs/RELACIONES.md).
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { GateState } from '@/models/types.js';
import type { ConfigurationData } from '@/models/configuration.model.js';
import type { UserOrmEntity } from '@/database/user.entity.js';
import type { PetOrmEntity } from '@/database/pet.entity.js';
import type { FeedingPlanOrmEntity } from '@/database/feeding-plan.entity.js';
import type { AccessSessionOrmEntity } from '@/database/access-session.entity.js';
import type { DispensingRecordOrmEntity } from '@/database/dispensing-record.entity.js';

@Entity('feeder_devices')
export class FeederDeviceOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  ownerId: string;

  // User 1 ── MANAGES ── 0..* FeederDevice
  @ManyToOne('UserOrmEntity', (user: UserOrmEntity) => user.feederDevices)
  @JoinColumn({ name: 'ownerId' })
  user: UserOrmEntity;

  @Column()
  name: string;

  // Pet 1 ── LINKED ── 1 FeederDevice. Regla de negocio: un comedero sirve a
  // una sola mascota (dos mascotas = dos comederos). La restricción única que
  // genera el 1-1 cubre ambos sentidos: ni dos comederos con la misma mascota
  // ni una mascota en dos comederos. Antes era la relación M-N device_pets.
  @Column({ type: 'uuid', nullable: true })
  petId: string | null;

  @OneToOne('PetOrmEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'petId' })
  pet: PetOrmEntity | null;

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

  // Snapshot (con revisión) de lo enviado/aceptado por el dispositivo; no se
  // deriva de otras tablas, por eso vive aquí (DeviceRepository en clases.txt).
  @Column({ type: 'jsonb', nullable: true })
  desiredConfiguration: ConfigurationData | null;

  @Column({ type: 'jsonb', nullable: true })
  appliedConfiguration: ConfigurationData | null;

  // FeederDevice 1 ── USES (Agregación) ── 0..* FeedingPlan
  @OneToMany('FeedingPlanOrmEntity', (plan: FeedingPlanOrmEntity) => plan.device)
  plans: FeedingPlanOrmEntity[];

  // FeederDevice 1 ── HOSTS ── 0..* AccessSession
  @OneToMany('AccessSessionOrmEntity', (session: AccessSessionOrmEntity) => session.device)
  accessSessions: AccessSessionOrmEntity[];

  // FeederDevice 1 ── PRODUCES ── 0..* DispensingRecord
  @OneToMany('DispensingRecordOrmEntity', (record: DispensingRecordOrmEntity) => record.device)
  dispensingRecords: DispensingRecordOrmEntity[];
}
