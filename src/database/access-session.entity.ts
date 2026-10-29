// access-session.entity.ts
// Relaciones por nombre de clase + `import type`: evitan ciclos ESM en runtime (docs/RELACIONES.md).
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AccessStatus } from '@/models/types.js';
import type { FeederDeviceOrmEntity } from '@/database/feeder-device.entity.js';
import type { RfidTagOrmEntity } from '@/database/rfid-tag.entity.js';
import type { PetOrmEntity } from '@/database/pet.entity.js';

@Entity('access_sessions')
export class AccessSessionOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  // FeederDevice 1 ── HOSTS ── 0..* AccessSession
  @ManyToOne('FeederDeviceOrmEntity', (device: FeederDeviceOrmEntity) => device.accessSessions)
  @JoinColumn({ name: 'deviceId' })
  device: FeederDeviceOrmEntity;

  @Column()
  tagUid: string;

  // RfidTag 1 ── IDENTIFIES ── 0..* AccessSession
  @ManyToOne('RfidTagOrmEntity', (tag: RfidTagOrmEntity) => tag.accessSessions)
  @JoinColumn({ name: 'tagUid', referencedColumnName: 'uid' })
  tag: RfidTagOrmEntity;

  @Column('uuid')
  petId: string;

  // Mascota que abrió la sesión: queda congelada aquí aunque el tag se
  // reasigne a otra mascota más adelante.
  @ManyToOne('PetOrmEntity')
  @JoinColumn({ name: 'petId' })
  pet: PetOrmEntity;

  @Column({ type: 'date' })
  accountingDay: string;

  @Column({ type: 'timestamptz', nullable: true })
  openedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'double precision', nullable: true })
  initialGrams: number | null;

  @Column({ type: 'double precision', nullable: true })
  finalGrams: number | null;

  @Column({ default: false })
  measurementValid: boolean;

  @Column({ type: 'varchar' })
  status: AccessStatus;

  @Column({ type: 'varchar', nullable: true })
  issue: string | null;
}
