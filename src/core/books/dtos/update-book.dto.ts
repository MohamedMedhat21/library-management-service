import {
  IsISBN,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookDto {
  @ApiPropertyOptional({ example: 'Clean Code', description: 'Book title' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'Robert C. Martin',
    description: 'Author name',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  author?: string;

  @ApiPropertyOptional({
    example: '9780132350884',
    description: 'ISBN-10 or ISBN-13',
  })
  @IsOptional()
  @IsISBN()
  isbn?: string;

  @ApiPropertyOptional({ example: 5, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableQuantity?: number;

  @ApiPropertyOptional({ example: 'A3-12' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  shelfLocation?: string;
}
