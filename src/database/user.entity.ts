// user.entity.ts
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null;
}
