import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { Log } from '../../database/entities/log.entity';

@Injectable()
export class LogsService extends DatabaseService<Log> {
  constructor(
    @InjectRepository(Log)
    private readonly logRepo: Repository<Log>,
  ) {
    super(logRepo);
  }
}
