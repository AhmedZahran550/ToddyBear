import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UsersService extends DatabaseService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super(userRepo);
  }

  async findByMobileNumber(mobileNumber: string): Promise<User | null> {
    return this.findOne({ where: { mobileNumber } });
  }

  async deleteUserEntity(user: User): Promise<void> {
    await this.userRepo.remove(user);
  }
}
