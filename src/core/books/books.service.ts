import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateBookDto } from './dtos/create-book.dto';
import { UpdateBookDto } from './dtos/update-book.dto';
import { BookResponseDto } from './dtos/book-response.dto';
import { Book } from './entities/book.entity';
import { RedisService } from 'src/infrastructure/cache/redis.service';

const BOOKS_CACHE_KEY = 'books:all';
const BOOKS_CACHE_TTL = 600; // 10 minutes

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateBookDto): Promise<BookResponseDto> {
    const existing = await this.bookRepository.findOne({
      where: { isbn: dto.isbn },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException(
        `A book with ISBN "${dto.isbn}" already exists`,
      );
    }

    const book = this.bookRepository.create(dto);
    const saved = await this.bookRepository.save(book);

    await this.redisService.del(BOOKS_CACHE_KEY);

    return BookResponseDto.fromEntity(saved);
  }

  async findAll(): Promise<BookResponseDto[]> {
    // 1. Try cache first
    const cached = await this.redisService.get(BOOKS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as BookResponseDto[];
    }

    // 2. Cache miss — query DB
    const books = await this.bookRepository.find({
      order: { createdAt: 'DESC' },
    });

    const dtos = BookResponseDto.fromEntities(books);

    // 3. Cache the mapped DTOs, not the raw entities —
    //    this way the cached shape is already clean on the way out
    await this.redisService.set(
      BOOKS_CACHE_KEY,
      JSON.stringify(dtos),
      BOOKS_CACHE_TTL,
    );

    return dtos;
  }

  async search(query: string): Promise<BookResponseDto[]> {
    const books = await this.bookRepository.find({
      where: [
        { title: ILike(`%${query}%`) },
        { author: ILike(`%${query}%`) },
        { isbn: ILike(`%${query}%`) },
      ],
      order: { title: 'ASC' },
    });

    return BookResponseDto.fromEntities(books);
  }

  // Internal helper — returns the raw entity so update/remove can work with it
  private async getBookEntity(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id } });
    if (!book) throw new NotFoundException(`Book #${id} not found`);
    return book;
  }

  async findOne(id: number): Promise<BookResponseDto> {
    const book = await this.getBookEntity(id);
    return BookResponseDto.fromEntity(book);
  }

  async update(id: number, dto: UpdateBookDto): Promise<BookResponseDto> {
    const book = await this.getBookEntity(id);

    if (dto.isbn && dto.isbn !== book.isbn) {
      const conflict = await this.bookRepository.findOne({
        where: { isbn: dto.isbn },
        withDeleted: true,
      });
      if (conflict) {
        throw new ConflictException(
          `A book with ISBN "${dto.isbn}" already exists`,
        );
      }
    }

    Object.assign(book, dto);
    const saved = await this.bookRepository.save(book);

    await this.redisService.del(BOOKS_CACHE_KEY);

    return BookResponseDto.fromEntity(saved);
  }

  async remove(id: number): Promise<void> {
    const book = await this.getBookEntity(id);
    await this.bookRepository.softRemove(book);

    await this.redisService.del(BOOKS_CACHE_KEY);
  }
}
