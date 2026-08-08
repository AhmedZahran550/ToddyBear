import { SetMetadata } from '@nestjs/common';
import { EmployeeRole } from '../../database/entities/employee.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (EmployeeRole | string)[]) => SetMetadata(ROLES_KEY, roles);
