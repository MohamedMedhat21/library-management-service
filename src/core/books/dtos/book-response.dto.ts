import { ApiProperty } from '@nestjs/swagger';
import { Book } from '../entities/book.entity';

export class BookResponseDto {
  @ApiProperty({ example: 'Clean Code' })
  title: string;

  @ApiProperty({ example: 'Robert C. Martin' })
  author: string;

  @ApiProperty({ example: '9780132350884' })
  isbn: string;

  @ApiProperty({ example: 5 })
  availableQuantity: number;

  @ApiProperty({ example: 'A3-12' })
  shelfLocation: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(book: Book): BookResponseDto {
    const dto = new BookResponseDto();
    dto.title = book.title;
    dto.author = book.author;
    dto.isbn = book.isbn;
    dto.availableQuantity = book.availableQuantity;
    dto.shelfLocation = book.shelfLocation;
    dto.createdAt = book.createdAt;
    dto.updatedAt = book.updatedAt;
    return dto;
  }

  static fromEntities(books: Book[]): BookResponseDto[] {
    return books.map((b) => BookResponseDto.fromEntity(b));
  }
}
