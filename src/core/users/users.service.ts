import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { User } from './entities/user.entity';
import { BorrowingService } from '../borrowing/borrowing.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => BorrowingService))
    private readonly borrowingService: BorrowingService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }

    const user = this.userRepository.create({
      ...dto,
      registeredDate: new Date(),
    });
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      order: { registeredDate: 'DESC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.userRepository.findOne({
        where: { email: dto.email },
        withDeleted: true,
      });
      if (conflict) {
        throw new ConflictException(
          `Email "${dto.email}" is already registered`,
        );
      }
    }

    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    const hasBorrowing = await this.borrowingService.hasActiveBorrowing({
      userId: id,
    });

    if (hasBorrowing) {
      throw new ConflictException(
        `User #${id} has active borrowing records and cannot be deleted`,
      );
    }
    await this.userRepository.softRemove(user);
  }
}
