import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { Employee } from '../../database/entities/employee.entity';

@Injectable()
export class EmployeesService extends DatabaseService<Employee> {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {
    super(employeeRepo);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.findOne({ where: { email } });
  }
}
