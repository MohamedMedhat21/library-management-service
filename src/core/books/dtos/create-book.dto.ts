import {
  IsISBN,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  author: string;

  @IsISBN()
  isbn: string;

  @IsInt()
  @Min(0)
  availableQuantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  shelfLocation: string;
}
