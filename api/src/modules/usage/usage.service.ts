import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { Usage } from '../../database/entities/usage.entity';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsageService extends DatabaseService<Usage> {
  constructor(
    @InjectRepository(Usage)
    private readonly usageRepo: Repository<Usage>,
  ) {
    super(usageRepo);
  }

  async logTokens(data: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
    userId?: string;
  }): Promise<Usage> {
    return this.create(data as any);
  }

  async findByUser(userId: string, pagination: PaginationQueryDto) {
    return this.findAll(pagination, { where: { userId } });
  }

  async getStatsByUser(userId: string) {
    const raw = await this.usageRepo
      .createQueryBuilder('usage')
      .select('SUM(usage.promptTokens)', 'totalPromptTokens')
      .addSelect('SUM(usage.completionTokens)', 'totalCompletionTokens')
      .addSelect('SUM(usage.totalTokens)', 'totalTokens')
      .addSelect('COUNT(*)', 'totalInteractions')
      .where('usage.userId = :userId', { userId })
      .getRawOne();

    return {
      userId,
      totalPromptTokens: parseInt(raw.totalPromptTokens || '0', 10),
      totalCompletionTokens: parseInt(raw.totalCompletionTokens || '0', 10),
      totalTokens: parseInt(raw.totalTokens || '0', 10),
      totalInteractions: parseInt(raw.totalInteractions || '0', 10),
    };
  }

  async getOverallStats() {
    const raw = await this.usageRepo
      .createQueryBuilder('usage')
      .select('SUM(usage.promptTokens)', 'totalPromptTokens')
      .addSelect('SUM(usage.completionTokens)', 'totalCompletionTokens')
      .addSelect('SUM(usage.totalTokens)', 'totalTokens')
      .addSelect('COUNT(*)', 'totalInteractions')
      .getRawOne();

    return {
      totalPromptTokens: parseInt(raw.totalPromptTokens || '0', 10),
      totalCompletionTokens: parseInt(raw.totalCompletionTokens || '0', 10),
      totalTokens: parseInt(raw.totalTokens || '0', 10),
      totalInteractions: parseInt(raw.totalInteractions || '0', 10),
    };
  }
}
