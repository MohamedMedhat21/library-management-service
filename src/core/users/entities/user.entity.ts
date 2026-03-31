import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BorrowingRecord } from '../../borrowing/entities/borrowing-record.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('idx_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({
    name: 'registered_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  registeredDate: Date;

  @OneToMany(() => BorrowingRecord, (record) => record.user)
  borrowingRecords: BorrowingRecord[];

  @Index('idx_users_deleted_at')
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
