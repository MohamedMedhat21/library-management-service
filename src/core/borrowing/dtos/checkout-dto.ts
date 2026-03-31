import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CheckoutBookDto {
  @IsInt()
  @IsPositive()
  bookId: number;

  @IsInt()
  @IsPositive()
  userId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  loanDays?: number; // defaults to 14 if omitted
}
