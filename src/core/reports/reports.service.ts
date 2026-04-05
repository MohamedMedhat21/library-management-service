import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { stringify } from 'csv-stringify/sync';
import { BorrowingRecord } from '../borrowing/entities/borrowing-record.entity';
import { BorrowingStatus } from '../borrowing/enums/borrowing-status.enum';
import { AnalyticsReport, getLastMonthRange } from './utils/helpers';
import { CSV_COLUMNS } from './utils/constants';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(BorrowingRecord)
    private readonly borrowingRepository: Repository<BorrowingRecord>,
  ) {}

  private async fetchRecords(
    from: Date,
    to: Date,
    statuses?: BorrowingStatus[],
  ): Promise<BorrowingRecord[]> {
    const qb = this.borrowingRepository
      .createQueryBuilder('br')
      .leftJoinAndSelect('br.book', 'book')
      .leftJoinAndSelect('br.user', 'user')
      .where('br.checkout_date BETWEEN :from AND :to', { from, to })
      .orderBy('br.checkout_date', 'DESC');

    if (statuses?.length) {
      qb.andWhere('br.status IN (:...statuses)', { statuses });
    }

    return await qb.getMany();
  }

  private toCsv(records: BorrowingRecord[]): string {
    if (!records.length) return 'No records found for the selected period.\n';

    const rows = records.map((r) => ({
      recordId: r.id,
      userName: r.user.name,
      userEmail: r.user.email,
      bookTitle: r.book.title,
      bookIsbn: r.book.isbn,
      checkoutDate: r.checkoutDate.toISOString(),
      dueDate: r.dueDate.toISOString(),
      returnDate: r.returnDate?.toISOString() ?? '',
      status: r.status,
    }));

    return stringify(rows, { header: true, columns: CSV_COLUMNS });
  }

  async getAnalytics(from?: Date, to?: Date): Promise<AnalyticsReport> {
    const range = from && to ? { from, to } : getLastMonthRange();
    const records = await this.fetchRecords(range.from, range.to);

    const userMap = new Map<
      string,
      { name: string; email: string; checkouts: number }
    >();

    const bookMap = new Map<
      string,
      { title: string; isbn: string; checkouts: number }
    >();

    for (const r of records) {
      const userKey = r.user.email;
      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          name: r.user.name,
          email: userKey,
          checkouts: 0,
        });
      }
      userMap.get(userKey)!.checkouts++;

      const bookKey = r.book.isbn;
      if (!bookMap.has(bookKey)) {
        bookMap.set(bookKey, {
          title: r.book.title,
          isbn: bookKey,
          checkouts: 0,
        });
      }
      bookMap.get(bookKey)!.checkouts++;
    }

    return {
      period: { from: range.from.toISOString(), to: range.to.toISOString() },
      totalCheckouts: records.length,
      totalReturned: records.filter(
        (r) => r.status === BorrowingStatus.RETURNED,
      ).length,
      totalOverdue: records.filter((r) => r.status === BorrowingStatus.OVERDUE)
        .length,
      activeCheckouts: records.filter(
        (r) => r.status === BorrowingStatus.CHECKED_OUT,
      ).length,
      topUsers: [...userMap.values()]
        .sort((a, b) => b.checkouts - a.checkouts)
        .slice(0, 5),
      topBooks: [...bookMap.values()]
        .sort((a, b) => b.checkouts - a.checkouts)
        .slice(0, 5),
    };
  }

  async getOverdueCsv(): Promise<string> {
    const { from, to } = getLastMonthRange();
    const records = await this.fetchRecords(from, to, [
      BorrowingStatus.OVERDUE,
    ]);
    return this.toCsv(records);
  }

  async getAllBorrowingCsv(): Promise<string> {
    const { from, to } = getLastMonthRange();
    const records = await this.fetchRecords(from, to);
    return this.toCsv(records);
  }
}
