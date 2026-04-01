import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
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
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async create(dto: CreateBookDto): Promise<BookResponseDto> {
    const existing = await this.bookRepository.findOne({
      where: { isbn: dto.isbn },
      withDeleted: true,
    });

    if (existing) {
      this.logger.warn('Book creation failed — duplicate ISBN', {
        context: 'BooksService',
        isbn: dto.isbn,
      });
      throw new ConflictException(
        `A book with ISBN "${dto.isbn}" already exists`,
      );
    }

    const book = this.bookRepository.create(dto);
    const saved = await this.bookRepository.save(book);

    await this.redisService.del(BOOKS_CACHE_KEY);

    this.logger.info('Book created', {
      context: 'BooksService',
      isbn: saved.isbn,
      title: saved.title,
    });

    return BookResponseDto.fromEntity(saved);
  }

  async findAll(): Promise<BookResponseDto[]> {
    const cached = await this.redisService.get(BOOKS_CACHE_KEY);

    if (cached) {
      this.logger.debug('findAll cache hit', { context: 'BooksService' });
      return JSON.parse(cached) as BookResponseDto[];
    }

    this.logger.debug('findAll cache miss — querying DB', {
      context: 'BooksService',
    });

    const books = await this.bookRepository.find({
      order: { createdAt: 'DESC' },
    });

    const booksDTO = BookResponseDto.fromEntities(books);

    await this.redisService.set(
      BOOKS_CACHE_KEY,
      JSON.stringify(booksDTO),
      BOOKS_CACHE_TTL,
    );

    return booksDTO;
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

  // Internal — returns raw entity so update/remove can mutate it
  private async getBookEntity(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id } });
    if (!book) {
      this.logger.warn('Book not found', { context: 'BooksService', id });
      throw new NotFoundException(`Book #${id} not found`);
    }
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
        this.logger.warn('Book update failed — duplicate ISBN', {
          context: 'BooksService',
          id,
          isbn: dto.isbn,
        });
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
    // TODO: check if the book is currently borrowed and prevent deletion if so (not implemented here, but should be in a real app)
    await this.bookRepository.softRemove(book);

    await this.redisService.del(BOOKS_CACHE_KEY);
  }
}
