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

  async findByDevice(deviceId: string, pagination: PaginationQueryDto) {
    return this.findAll(pagination, { where: { deviceId } });
  }

  async findDueAlarms(currentHM: string): Promise<Alarm[]> {
    return this.alarmRepo.find({
      where: { time: currentHM, enabled: true },
      relations: { device: true },
    });
  }
}
