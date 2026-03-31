import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { RedisService } from 'src/infrastructure/cache/redis.service';

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softRemove: jest.fn(),
});

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

  describe('create', () => {
    const dto = {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '9780132350884',
      availableQuantity: 5,
      shelfLocation: 'A3-12',
    };

    it('should create and return a book when ISBN is unique', async () => {
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
      expect(result).toEqual(mockBook);
    });

    it('should throw ConflictException when ISBN already exists', async () => {
      repository.findOne!.mockResolvedValue(mockBook);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return cached books if cache exists (cache hit)', async () => {
      const cachedBooks = [
        {
          ...mockBook,
          createdAt: mockBook.createdAt.toISOString(),
          updatedAt: mockBook.updatedAt.toISOString(),
        },
      ];

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedBooks));

      const result = await service.findAll();

      expect(mockRedisService.get).toHaveBeenCalled();
      expect(repository.find).not.toHaveBeenCalled();
      expect(result).toEqual(cachedBooks);
    });

    it('should fetch from DB and cache result when cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null); // 👈 cache miss
      repository.find!.mockResolvedValue([mockBook]);

      const result = await service.findAll();

      expect(mockRedisService.get).toHaveBeenCalled();
      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(mockRedisService.set).toHaveBeenCalled(); // 👈 cached
      expect(result).toEqual([mockBook]);
    });

    it('should return empty array when no books exist (cache miss)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      repository.find!.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a book when it exists', async () => {
      repository.findOne!.mockResolvedValue(mockBook);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockBook);
    });

    it('should throw NotFoundException when book does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(99)).rejects.toThrow('Book #99 not found');
    });
  });

  describe('search', () => {
    it('should return books matching the query', async () => {
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
      expect(result).toEqual([mockBook]);
    });

    it('should return empty array when no books match', async () => {
      repository.find!.mockResolvedValue([]);

      const result = await service.search('zzznomatch');
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update and return the book', async () => {
      const updated = { ...mockBook, title: 'Clean Architecture' };
      repository.findOne!.mockResolvedValue(mockBook);
      repository.save!.mockResolvedValue(updated);

      const result = await service.update(1, { title: 'Clean Architecture' });

      expect(result.title).toBe('Clean Architecture');
    });

    it('should throw NotFoundException when book does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.update(99, { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when new ISBN already belongs to another book', async () => {
      const anotherBook = { ...mockBook, id: 2, isbn: '9780132350000' };
      // First findOne (findOne inside update) returns current book
      // Second findOne (ISBN conflict check) returns a different book
      repository
        .findOne!.mockResolvedValueOnce(mockBook)
        .mockResolvedValueOnce(anotherBook);

      await expect(
        service.update(1, { isbn: '9780132350000' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft-delete an existing book', async () => {
      repository.findOne!.mockResolvedValue(mockBook);
      repository.softRemove!.mockResolvedValue(undefined);

      await service.remove(1);

      expect(repository.softRemove).toHaveBeenCalledWith(mockBook);
    });

    it('should throw NotFoundException when book does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repository.softRemove).not.toHaveBeenCalled();
    });
  });
});
