import { BorrowingRecord } from 'src/core/borrowing/entities/borrowing-record.entity';
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

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_books_title')
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Index('idx_books_author')
  @Column({ type: 'varchar', length: 255 })
  author: string;

  @Index('idx_books_isbn', { unique: true })
  @Column({ type: 'varchar', length: 20, unique: true })
  isbn: string;

  @Column({ type: 'int', default: 0, name: 'available_quantity' })
  availableQuantity: number;

  @Column({ type: 'varchar', length: 100, name: 'shelf_location' })
  shelfLocation: string;

  @OneToMany(() => BorrowingRecord, (record) => record.book)
  borrowingRecords: BorrowingRecord[];

  @Index('idx_books_deleted_at')
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
