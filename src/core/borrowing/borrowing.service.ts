import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { BorrowingRecord } from './entities/borrowing-record.entity';
import { Book } from '../books/entities/book.entity';
import { BooksService } from '../books/books.service';
import { CheckoutBookDto } from './dtos/checkout.dto';
import { BorrowingStatus } from './enums/borrowing-status.enum';
import { UsersService } from '../users/users.service';

const DEFAULT_LOAN_DAYS = 14;

@Injectable()
export class BorrowingService {
  constructor(
    @InjectRepository(BorrowingRecord)
    private readonly borrowingRepository: Repository<BorrowingRecord>,
    private readonly booksService: BooksService,
    private readonly usersService: UsersService,
  ) {}

  async checkout(dto: CheckoutBookDto): Promise<BorrowingRecord> {
    const [user, borrowed] = await Promise.all([
      this.usersService.findOne(dto.userId),
      this.borrowingRepository.exists({
        where: {
          book: { id: dto.bookId },
          user: { id: dto.userId },
          status: BorrowingStatus.CHECKED_OUT,
        },
      }),
    ]);

    if (borrowed) {
      throw new BadRequestException('This user has already borrowed this book');
    }

    const queryRunner =
      this.borrowingRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const book = await queryRunner.manager.findOne(Book, {
        where: { id: dto.bookId },
        lock: { mode: 'pessimistic_write' }, // SELECT ... FOR UPDATE
      });

      if (!book) {
        throw new NotFoundException(`Book #${dto.bookId} not found`);
      }

      if (book.availableQuantity < 1) {
        throw new BadRequestException(`Book "${book.title}" is not available`);
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (dto.loanDays ?? DEFAULT_LOAN_DAYS));

      const result = await queryRunner.manager.decrement(
        Book,
        { id: book.id, availableQuantity: MoreThan(0) },
        'availableQuantity',
        1,
      );

      if (!result.affected || result.affected === 0) {
        throw new BadRequestException(`Book "${book.title}" is not available`);
      }

      const record = queryRunner.manager.create(BorrowingRecord, {
        book,
        user,
        dueDate,
        status: BorrowingStatus.CHECKED_OUT,
      });

      const saved = await queryRunner.manager.save(record);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async returnBook(recordId: number): Promise<BorrowingRecord> {
    const record = await this.borrowingRepository.findOne({
      where: { id: recordId },
      relations: ['book', 'user'],
    });

    if (!record)
      throw new NotFoundException(`Borrowing record #${recordId} not found`);

    if (record.status === BorrowingStatus.RETURNED) {
      throw new BadRequestException('This book has already been returned');
    }

    const queryRunner =
      this.borrowingRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      record.returnDate = new Date();
      record.status = BorrowingStatus.RETURNED;
      const saved = await queryRunner.manager.save(record);

      await queryRunner.manager.increment(
        Book,
        { id: record.book.id },
        'availableQuantity',
        1,
      );

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserBorrowedBooks(userId: number): Promise<BorrowingRecord[]> {
    await this.usersService.findOne(userId);

    return this.borrowingRepository
      .createQueryBuilder('br')
      .leftJoinAndSelect('br.book', 'book')
      .where('br.user_id = :userId', { userId })
      .andWhere('br.status IN (:...statuses)', {
        statuses: [BorrowingStatus.CHECKED_OUT, BorrowingStatus.OVERDUE],
      })
      .orderBy('br.due_date', 'ASC')
      .getMany();
  }

  /**
   * Uses idx_br_due_date and idx_br_status indexes.
   */
  async getOverdueBooks(): Promise<BorrowingRecord[]> {
    const now = new Date();

    // Bulk-update any checked_out records past their due date to overdue
    // TODO: MOVE TO A CRON JOB INSTEAD
    await this.borrowingRepository
      .createQueryBuilder()
      .update(BorrowingRecord)
      .set({ status: BorrowingStatus.OVERDUE })
      .where('status = :status', { status: BorrowingStatus.CHECKED_OUT })
      .andWhere('due_date < :now', { now })
      .execute();

    return this.borrowingRepository.find({
      where: {
        status: BorrowingStatus.OVERDUE,
        dueDate: LessThan(now),
      },
      relations: ['book', 'user'],
      order: { dueDate: 'ASC' },
    });
  }
}
