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

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
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
    return this.bookRepository.save(book);
  }

  async findAll(): Promise<Book[]> {
    return this.bookRepository.find({
      order: { createdAt: 'DESC' },
    });
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
    return this.bookRepository.save(book);
  }

  async remove(id: number): Promise<void> {
    const book = await this.findOne(id);
    // TODO: check if the book is currently borrowed and prevent deletion if so (not implemented here, but should be in a real app)
    await this.bookRepository.softRemove(book);
  }
}
