import type { DeepPartial, FindManyOptions, FindOneOptions } from 'typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import {
  PaginationQueryDto,
  PaginatedResultDto,
} from '../common/dto/pagination.dto';

export abstract class DatabaseService<T extends Record<string, any>> {
  constructor(protected readonly repository: Repository<T>) {}

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    options?: FindManyOptions<T>,
  ): Promise<PaginatedResultDto<T>> {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      ...options,
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, options?: FindOneOptions<T>): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as any,
      ...options,
    });
    if (!entity) {
      throw new NotFoundException(`Record with ID "${id}" not found`);
    }
    return entity;
  }

  async findOneBy(where: Partial<T>): Promise<T | null> {
    return this.repository.findOne({ where: where as any });
  }

  async update(id: string, data: DeepPartial<T>): Promise<T> {
    const entity = (await this.findOne(id)) as any;
    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }
}
