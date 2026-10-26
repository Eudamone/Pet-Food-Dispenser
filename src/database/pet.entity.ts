// pet.entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('pets')
export class PetOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  ownerId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  species: string | null;

  @Column({ type: 'double precision', nullable: true })
  dailyLimitGrams: number | null;

  @Column({ type: 'int', nullable: true })
  birthYear: number | null;

  @Column({ type: 'int', nullable: true })
  birthMonth: number | null;

  @Column({ type: 'int', nullable: true })
  birthDay: number | null;
}
