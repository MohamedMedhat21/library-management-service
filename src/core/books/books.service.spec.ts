import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { BookResponseDto } from './dtos/book-response.dto';
import { RedisService } from 'src/infrastructure/cache/redis.service';

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softRemove: jest.fn(),
});

// Raw entity as returned by the repository
const mockBook: Book = {
  id: 1,
  title: 'Clean Code',
  author: 'Robert C. Martin',
  isbn: '9780132350884',
  availableQuantity: 5,
  shelfLocation: 'A3-12',
  borrowingRecords: [],
  deletedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// Expected DTO shape — no id, no borrowingRecords, no deletedAt
const mockBookDto: BookResponseDto = {
  title: 'Clean Code',
  author: 'Robert C. Martin',
  isbn: '9780132350884',
  availableQuantity: 5,
  shelfLocation: 'A3-12',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('BooksService', () => {
  let service: BooksService;
  let repository: MockRepository<Book>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: getRepositoryToken(Book),
          useValue: createMockRepository<Book>(),
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    repository = module.get<MockRepository<Book>>(getRepositoryToken(Book));
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '9780132350884',
      availableQuantity: 5,
      shelfLocation: 'A3-12',
    };

    it('should create and return a BookResponseDto when ISBN is unique', async () => {
      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue(mockBook);
      repository.save!.mockResolvedValue(mockBook);

      const result = await service.create(dto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { isbn: dto.isbn },
        withDeleted: true,
      });
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(mockBook);
      expect(mockRedisService.del).toHaveBeenCalledWith('books:all');
      // id must not be present in the response
      expect(result).not.toHaveProperty('id');
      expect(result).toEqual(mockBookDto);
    });

    it('should throw ConflictException when ISBN already exists', async () => {
      repository.findOne!.mockResolvedValue(mockBook);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return cached BookResponseDto[] on cache hit', async () => {
      const cachedDtos = [
        {
          ...mockBookDto,
          createdAt: mockBookDto.createdAt.toISOString(),
          updatedAt: mockBookDto.updatedAt.toISOString(),
        },
      ];
      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedDtos));

      const result = await service.findAll();

      expect(mockRedisService.get).toHaveBeenCalledWith('books:all');
      expect(repository.find).not.toHaveBeenCalled();
      expect(result).toEqual(cachedDtos);
      // Confirm id is absent even from cached data
      expect(result[0]).not.toHaveProperty('id');
    });

    it('should fetch from DB, map to DTO, and cache on cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      repository.find!.mockResolvedValue([mockBook]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'books:all',
        JSON.stringify([mockBookDto]),
        60,
      );
      expect(result[0]).not.toHaveProperty('id');
      expect(result).toEqual([mockBookDto]);
    });

    it('should return empty array when no books exist (cache miss)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      repository.find!.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a BookResponseDto without id', async () => {
      repository.findOne!.mockResolvedValue(mockBook);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).not.toHaveProperty('id');
      expect(result).toEqual(mockBookDto);
    });

    it('should throw NotFoundException when book does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(99)).rejects.toThrow('Book #99 not found');
    });
  });

  // ── search ───────────────────────────────────────────────────────────────

  describe('search', () => {
    it('should return matching books as BookResponseDto[]', async () => {
      repository.find!.mockResolvedValue([mockBook]);

      const result = await service.search('clean');

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ title: expect.anything() }),
            expect.objectContaining({ author: expect.anything() }),
            expect.objectContaining({ isbn: expect.anything() }),
          ]),
        }),
      );
      expect(result[0]).not.toHaveProperty('id');
      expect(result).toEqual([mockBookDto]);
    });

    it('should return empty array when no books match', async () => {
      repository.find!.mockResolvedValue([]);

      const result = await service.search('zzznomatch');
      expect(result).toEqual([]);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return a BookResponseDto without id', async () => {
      const updatedEntity = { ...mockBook, title: 'Clean Architecture' };
      const updatedDto = { ...mockBookDto, title: 'Clean Architecture' };
      repository.findOne!.mockResolvedValue(mockBook);
      repository.save!.mockResolvedValue(updatedEntity);

      const result = await service.update(1, { title: 'Clean Architecture' });

      expect(mockRedisService.del).toHaveBeenCalledWith('books:all');
      expect(result).not.toHaveProperty('id');
      expect(result).toEqual(updatedDto);
    });

    it('should throw NotFoundException when book does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.update(99, { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when new ISBN already belongs to another book', async () => {
      const anotherBook = { ...mockBook, id: 2, isbn: '9780132350000' };
      repository
        .findOne!.mockResolvedValueOnce(mockBook)
        .mockResolvedValueOnce(anotherBook);

      await expect(
        service.update(1, { isbn: '9780132350000' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete the book and invalidate cache', async () => {
      repository.findOne!.mockResolvedValue(mockBook);
      repository.softRemove!.mockResolvedValue(undefined);

      await service.remove(1);

      expect(repository.softRemove).toHaveBeenCalledWith(mockBook);
      expect(mockRedisService.del).toHaveBeenCalledWith('books:all');
    });

    it('should throw NotFoundException when book does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repository.softRemove).not.toHaveBeenCalled();
    });
  });
});
