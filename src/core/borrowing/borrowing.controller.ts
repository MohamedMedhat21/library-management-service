import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { BorrowingService } from './borrowing.service';
import { CheckoutBookDto } from './dtos/checkout-dto';

@Controller('borrowing')
export class BorrowingController {
  constructor(private readonly borrowingService: BorrowingService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  checkout(@Body() dto: CheckoutBookDto) {
    return this.borrowingService.checkout(dto);
  }

  @Post(':recordId/return')
  @HttpCode(HttpStatus.OK)
  returnBook(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.borrowingService.returnBook(recordId);
  }

  @Get('users/:userId/active')
  getUserBorrowedBooks(@Param('userId', ParseIntPipe) userId: number) {
    return this.borrowingService.getUserBorrowedBooks(userId);
  }

  @Get('overdue')
  getOverdueBooks() {
    return this.borrowingService.getOverdueBooks();
  }
}
