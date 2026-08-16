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
    return this.findAll(pagination, {
      where: { userId },
      relations: { ringtone: true, device: true },
      order: { time: 'ASC' },
    });
  }

  async findDueAlarms(currentHM: string): Promise<Alarm[]> {
    return this.alarmRepo.find({
      where: { time: currentHM, enabled: true },
      relations: {
        user: { devices: true },
        ringtone: true,
        device: true,
      },
    });
  }

  async disableByTime(userId: string, time: string): Promise<number> {
    const result = await this.alarmRepo.update(
      { userId, time, enabled: true },
      { enabled: false },
    );
    return result.affected || 0;
  }
}
