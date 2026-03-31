import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowingRecord } from './entities/borrowing-record.entity';
import { BorrowingService } from './borrowing.service';
import { BorrowingController } from './borrowing.controller';
import { BooksModule } from '../books/books.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BorrowingRecord]),
    // CommonModule,
    // forwardRef(() => AuthModule),
    BooksModule,
    UsersModule,
  ],
  providers: [BorrowingService],
  controllers: [BorrowingController],
})
export class BorrowingModule {}
