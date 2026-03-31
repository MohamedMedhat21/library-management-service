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
import { CheckoutBookDto } from './dtos/checkout.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Borrowing')
@Controller('borrowing')
export class BorrowingController {
  constructor(private readonly borrowingService: BorrowingService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Check out a book to a borrower' })
  @ApiBody({ type: CheckoutBookDto })
  @ApiResponse({ status: 201, description: 'Book checked out successfully' })
  @ApiResponse({
    status: 400,
    description: 'Book not available or validation error',
  })
  @ApiResponse({ status: 404, description: 'Book or borrower not found' })
  @HttpCode(HttpStatus.CREATED)
  checkout(@Body() dto: CheckoutBookDto) {
    return this.borrowingService.checkout(dto);
  }

  @Post(':recordId/return')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return a borrowed book' })
  @ApiParam({
    name: 'recordId',
    type: Number,
    description: 'Borrowing record ID',
  })
  @ApiResponse({ status: 200, description: 'Book returned successfully' })
  @ApiResponse({ status: 400, description: 'Book already returned' })
  @ApiResponse({ status: 404, description: 'Borrowing record not found' })
  returnBook(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.borrowingService.returnBook(recordId);
  }

  @Get('users/:userId/active')
  @ApiOperation({ summary: 'Get all books currently held by a user' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of active borrowing records' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserBorrowedBooks(@Param('userId', ParseIntPipe) userId: number) {
    return this.borrowingService.getUserBorrowedBooks(userId);
  }

  @Get('overdue')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'List all overdue borrowing records' })
  @ApiResponse({ status: 200, description: 'List of overdue records' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  getOverdueBooks() {
    return this.borrowingService.getOverdueBooks();
  }
}
