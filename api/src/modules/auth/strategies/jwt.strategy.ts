import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { EmployeesService } from '../../employees/employees.service';

import { EmployeeRole } from '../../../database/entities/employee.entity';

export interface JwtPayload {
  sub: string;
  type: 'user' | 'employee';
  role?: string;
  isSuperAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'super-secret-jwt-key',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'user') {
      const user = await this.usersService.findOneById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account inactive or not found');
      }
      return { ...user, type: 'user' };
    } else if (payload.type === 'employee') {
      if (
        payload.isSuperAdmin &&
        payload.sub === '00000000-0000-0000-0000-000000000000'
      ) {
        const superAdminEmail =
          this.configService.get<string>('SUPER_ADMIN_EMAIL');
        return {
          id: payload.sub,
          email: superAdminEmail || 'superadmin@toddybear.com',
          name: 'Super Admin',
          role: EmployeeRole.SUPER_ADMIN,
          isActive: true,
          type: 'employee',
          isSuperAdmin: true,
        };
      }

      const employee = await this.employeesService.findOneById(payload.sub);
      if (!employee || !employee.isActive) {
        throw new UnauthorizedException(
          'Employee account inactive or not found',
        );
      }
      const superAdminEmail =
        this.configService.get<string>('SUPER_ADMIN_EMAIL');
      const isSuperAdmin =
        payload.isSuperAdmin ||
        (!!superAdminEmail &&
          employee.email.toLowerCase() === superAdminEmail.toLowerCase()) ||
        employee.role === EmployeeRole.SUPER_ADMIN;

      return {
        ...employee,
        type: 'employee',
        role: employee.role,
        isSuperAdmin,
      };
    }

    throw new UnauthorizedException('Invalid token payload');
  }
}
