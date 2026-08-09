import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { Alarm } from '../../database/entities/alarm.entity';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AlarmsService extends DatabaseService<Alarm> {
  constructor(
    @InjectRepository(Alarm)
    private readonly alarmRepo: Repository<Alarm>,
  ) {
    super(alarmRepo);
  }

  async findByUser(userId: string, pagination: PaginationQueryDto) {
    return this.findAll(pagination, { where: { userId } });
  }

  async findDueAlarms(currentHM: string): Promise<Alarm[]> {
    return this.alarmRepo.find({
      where: { time: currentHM, enabled: true },
      relations: { user: { devices: true } },
    });
  }
}
