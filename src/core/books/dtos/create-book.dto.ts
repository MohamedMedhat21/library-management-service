import {
  IsISBN,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({ example: 'Clean Code', description: 'Book title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Robert C. Martin', description: 'Author name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  author: string;

  @ApiProperty({ example: '9780132350884', description: 'ISBN-10 or ISBN-13' })
  @IsISBN()
  isbn: string;

  @ApiProperty({
    example: 5,
    description: 'Number of copies available',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  availableQuantity: number;

  @ApiProperty({ example: 'A3-12', description: 'Physical shelf location' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  shelfLocation: string;
}
