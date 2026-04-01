import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowingModule } from '../borrowing/borrowing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => BorrowingModule),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
