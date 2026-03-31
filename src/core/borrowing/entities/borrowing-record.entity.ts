import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Book } from '../../books/entities/book.entity';
import { BorrowingStatus } from '../enums/borrowing-status.enum';

@Entity('borrowing_records')
@Index('idx_br_user_status', ['user', 'status'])
@Index('idx_br_book_status', ['book', 'status'])
export class BorrowingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Book, (book) => book.borrowingRecords, { nullable: false })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @ManyToOne(() => User, (user) => user.borrowingRecords, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'checkout_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  checkoutDate: Date;

  @Index('idx_br_due_date')
  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

  @Column({ name: 'return_date', type: 'timestamp', nullable: true })
  returnDate: Date | null;

  @Index('idx_br_status')
  @Column({
    type: 'enum',
    enum: BorrowingStatus,
    default: BorrowingStatus.CHECKED_OUT,
  })
  status: BorrowingStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
