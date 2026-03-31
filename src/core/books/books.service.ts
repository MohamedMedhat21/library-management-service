import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateBookDto } from './dtos/create-book.dto';
import { UpdateBookDto } from './dtos/update-book.dto';
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

  async create(dto: CreateBookDto): Promise<Book> {
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

    return saved;
  }

  async findAll(): Promise<Book[]> {
    const cached = await this.redisService.get(BOOKS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Book[];
    }

    const books = await this.bookRepository.find({
      order: { createdAt: 'DESC' },
    });

    await this.redisService.set(
      BOOKS_CACHE_KEY,
      JSON.stringify(books),
      BOOKS_CACHE_TTL,
    );

    return books;
  }

  async search(query: string): Promise<Book[]> {
    return this.bookRepository.find({
      where: [
        { title: ILike(`%${query}%`) },
        { author: ILike(`%${query}%`) },
        { isbn: ILike(`%${query}%`) },
      ],
      order: { title: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id } });
    if (!book) throw new NotFoundException(`Book #${id} not found`);
    return book;
  }

  async update(id: number, dto: UpdateBookDto): Promise<Book> {
    const book = await this.findOne(id);

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

    return saved;
  }

  async remove(id: number): Promise<void> {
    const book = await this.findOne(id);
    // TODO: check if the book is currently borrowed and prevent deletion if so (not implemented here, but should be in a real app)
    await this.bookRepository.softRemove(book);

    await this.redisService.del(BOOKS_CACHE_KEY);
  }
}
