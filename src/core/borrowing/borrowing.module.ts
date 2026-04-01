import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowingRecord } from './entities/borrowing-record.entity';
import { BorrowingService } from './borrowing.service';
import { BorrowingController } from './borrowing.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BorrowingRecord]),
    forwardRef(() => UsersModule),
  ],
  providers: [BorrowingService],
  controllers: [BorrowingController],
  exports: [BorrowingService, TypeOrmModule],
})
export class BorrowingModule {}
