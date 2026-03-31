import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CheckoutBookDto {
  @ApiProperty({ example: 1, description: 'ID of the book to check out' })
  @IsInt()
  @IsPositive()
  bookId: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the user checking out the book',
  })
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiPropertyOptional({
    example: 14,
    description: 'Loan period in days (defaults to 14 if omitted)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  loanDays?: number; // defaults to 14 if omitted
}
